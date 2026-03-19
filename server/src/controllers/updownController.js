import UpDownRound from "../models/UpDownRound.js";
import UpDownBet from "../models/UpDownBet.js";
import User from "../models/User.js";
import GravityHistory from "../models/GravityHistory.js";
import { getCurrentState, getLiveStateSync, getGraphTimeStart, ensureLiveGraphFromDB, publishBetToAbly } from "../services/updown/updownGame.service.js";

export const getCurrent = async (req, res) => {
  try {
    const state = await getCurrentState();
    const serverTime = Date.now();
    const graphTimeStart = (state.phase === "trading" || state.phase === "result") ? getGraphTimeStart() : null;
    const phaseEndAt = state.phaseEndAt;
    const phaseEndMs = phaseEndAt ? new Date(phaseEndAt).getTime() : 0;
    const remainingMs = Math.max(0, phaseEndMs - serverTime);
    let graphDisplaySec = null;
    if (state.phase === "betting") {
      const elapsedMs = Math.max(0, 10 * 1000 - remainingMs);
      graphDisplaySec = Math.min(10, elapsedMs / 1000);
    } else if (state.phase === "trading") {
      const elapsedMs = Math.max(0, 5 * 1000 - remainingMs);
      graphDisplaySec = Math.min(5, elapsedMs / 1000);
    }
    return res.json({
      success: true,
      data: {
        phase: state.phase,
        phaseEndAt: state.phaseEndAt,
        round: state.round,
        serverTime,
        graphTimeStart: graphTimeStart ?? null,
        ...(graphDisplaySec != null && { graphDisplaySec }),
      },
    });
  } catch (err) {
    console.error("updown getCurrent error:", err);
    return res.status(500).json({ success: false, message: "Failed to get current state" });
  }
};

export const getLiveState = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    await ensureLiveGraphFromDB();
    const live = getLiveStateSync();
    return res.json({ success: true, data: live });
  } catch (err) {
    console.error("updown getLiveState error:", err);
    return res.status(500).json({ success: false, message: "Failed to get live state" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const rounds = await UpDownRound.find()
      .sort({ roundId: -1 })
      .limit(limit)
      .select("roundId result startValue endValue createdAt")
      .lean();
    return res.json({ success: true, data: rounds });
  } catch (err) {
    console.error("updown getHistory error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
};

export const getPreviousGraph = async (req, res) => {
  try {
    const last = await UpDownRound.findOne()
      .sort({ roundId: -1 })
      .select("roundId result startValue endValue graphData createdAt")
      .lean();
    if (!last) {
      return res.json({ success: true, data: null });
    }
    return res.json({ success: true, data: last });
  } catch (err) {
    console.error("updown getPreviousGraph error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch previous graph" });
  }
};

export const placeBet = async (req, res) => {
  try {
    const { roundId, direction, amount } = req.body;
    const userId = req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    if (roundId === undefined || !direction || amount === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    
    if (!["up", "down"].includes(direction)) {
      return res.status(400).json({ success: false, message: "Invalid direction" });
    }
    
    const betAmount = Number(amount);
    const betRoundId = Number(roundId);
    
    if (betAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    
    if (!betRoundId || betRoundId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid round ID" });
    }
    
    // Check user balance
    const user = await User.findOne({ userId }).select("balance altas avatar").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    console.log("User found:", { altas: user.altas, balance: user.balance, hasAvatar: !!user.avatar });
    
    if (user.balance < betAmount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Check if user already has a bet on the same side in this round
    const existingBet = await UpDownBet.findOne({ roundId: betRoundId });
    if (existingBet) {
      const sameDirectionIndex = existingBet.user.findIndex(u => u.userId === userId && u.direction === direction);
      if (sameDirectionIndex !== -1) {
        // User already has a bet on this side in this round - reject
        return res.status(400).json({ success: false, message: "You already have a bet on this side in this round" });
      }
    }
    
    // Deduct balance
    await User.findOneAndUpdate({ userId }, { $inc: { balance: -betAmount } });

    // New user data with direction included (must match UpDownBet.user sub-schema)
    const newUser = {
      avatar: user.avatar || "",
      userId,
      altas: user.altas || "Anonymous",
      amount: betAmount,
      direction,
      isUser: 1,
    };

    // Insert into UpDownBet.user first so the bet is always recorded (game creates doc with user: [] when round starts)
    let bet = await UpDownBet.findOneAndUpdate(
      { roundId: betRoundId },
      { $push: { user: newUser }, $inc: { amount: betAmount } },
      { new: true }
    );
    if (!bet) {
      await new Promise((r) => setTimeout(r, 150));
      bet = await UpDownBet.findOneAndUpdate(
        { roundId: betRoundId },
        { $push: { user: newUser }, $inc: { amount: betAmount } },
        { new: true }
      );
    }
    if (!bet) {
      await User.findOneAndUpdate({ userId }, { $inc: { balance: betAmount } });
      return res.status(409).json({
        success: false,
        message: "Round not ready for betting. Please refresh and try again.",
      });
    }

    // User totalhistory (non-critical; don't fail the request if this fails)
    try {
      const userData = await User.findOne({ userId });
      if (userData && Array.isArray(userData.totalhistory)) {
        userData.totalhistory.push({ amount: -betAmount, date: new Date(), type: "gravity" });
        await userData.save();
      }
    } catch (historyErr) {
      console.warn("placeBet: totalhistory update failed:", historyErr.message);
    }

    // Insert or update GravityHistory (one record per user per round; sum betAmount if they bet both sides)
    await GravityHistory.findOneAndUpdate(
      { roundId: betRoundId, userId },
      {
        $inc: { betAmount },
        $setOnInsert: { roundId: betRoundId, userId, userName: user.altas || "Anonymous" },
      },
      { upsert: true, new: true }
    );
    
    console.log("Bet created/updated:", bet);
    
    // Publish to Ably (don't wait for it, fire and forget)
    try {
      await publishBetToAbly({
        roundId: betRoundId,
        userId,
        userName: user.altas || "Anonymous",
        avatar: user.avatar || "",
        direction,
        amount: betAmount,
        createdAt: new Date()
      });
    } catch (ablyErr) {
      console.warn("Failed to publish bet to Ably:", ablyErr.message);
      // Don't fail the bet if Ably publish fails
    }
    
    return res.json({ success: true, data: bet });
  } catch (err) {
    console.error("updown placeBet error:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ success: false, message: "Failed to place bet" });
  }
};

export const getBetsByRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    
    if (!roundId) {
      return res.status(400).json({ success: false, message: "Missing roundId" });
    }
    
    const bet = await UpDownBet.findOne({ roundId: Number(roundId) })
      .select("user amount status payout multiplier createdAt")
      .lean();
    
    if (!bet || !bet.user) {
      return res.json({
        success: true,
        data: {
          upBets: [],
          downBets: [],
          totalUp: 0,
          totalDown: 0
        }
      });
    }

    // Separate users by direction and map to the structure the frontend expects
    const upBets = bet.user
      .filter(u => u.direction === "up")
      .map(u => ({
        userId: u.userId,
        userName: u.altas || "Anonymous",
        avatar: u.avatar || "",
        amount: u.amount || 0,
        createdAt: new Date()
      }));
    
    const downBets = bet.user
      .filter(u => u.direction === "down")
      .map(u => ({
        userId: u.userId,
        userName: u.altas || "Anonymous",
        avatar: u.avatar || "",
        amount: u.amount || 0,
        createdAt: new Date()
      }));
    
    // Calculate totals per direction
    const totalUp = upBets.reduce((sum, u) => sum + (u.amount || 0), 0);
    const totalDown = downBets.reduce((sum, u) => sum + (u.amount || 0), 0);
    
    return res.json({ 
      success: true, 
      data: {
        upBets,
        downBets,
        totalUp,
        totalDown
      }
    });
  } catch (err) {
    console.error("updown getBetsByRound error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch bets" });
  }
};

// export const saveRound = async (req, res) => {
//   try {
//     const { result, startValue, endValue, graphData } = req.body;
//     if (!result || (result !== "up" && result !== "down")) {
//       return res.status(400).json({ success: false, message: "Invalid result" });
//     }
//     const last = await UpDownRound.findOne().sort({ roundId: -1 }).select("roundId").lean();
//     const roundId = (last?.roundId ?? 0) + 1;
//     // Normalize graphData: store as { time, value } (accept price or value from client)
//     const normalizedGraphData = Array.isArray(graphData)
//       ? graphData.map((p) => ({
//           time: Number(p.time),
//           value: Number(p.value ?? p.price ?? 0),
//         }))
//       : [];
//     const round = await UpDownRound.create({
//       roundId,
//       result,
//       startValue: Number(startValue),
//       endValue: Number(endValue),
//       graphData: normalizedGraphData,
//     });
//     return res.json({ success: true, data: round });
//   } catch (err) {
//     console.error("updown saveRound error:", err);
//     return res.status(500).json({ success: false, message: "Failed to save round" });
//   }
// };
