import User from "../models/User.js";
import {
  cashOutCloudSpreadRound,
  getCloudSpreadRoundHistory,
  getCloudSpreadStateSnapshot,
  getCloudSpreadUserHistory,
  placeCloudSpreadBet,
} from "../services/cloudSpread/cloudSpreadGame.service.js";

export async function getCloudSpreadState(req, res) {
  try {
    const u = req.user;
    if (!u?.userId) return res.status(401).json({ message: "Unauthorized" });
    const state = await getCloudSpreadStateSnapshot(u.userId);
    if (!state) return res.status(503).json({ message: "Cloud Spread round is not ready" });
    return res.status(200).json(state);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function createCloudSpreadBet(req, res) {
  try {
    const { amount, targetStep } = req.body;
    const user = await User.findOne({ userAuthId: req.user.userAuthId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      round,
      betId,
      betAmount,
      multiplier,
      selectedCloud,
      selectedCloudStep,
      selectedCloudMultiplier,
      betsThisRound,
    } = await placeCloudSpreadBet({
      user,
      amount,
      targetStep,
    });
    return res.status(200).json({
      user,
      roundId: round.roundId,
      betId,
      betAmount: betAmount ?? amount,
      targetStep,
      targetMultiplier: multiplier,
      selectedCloud,
      selectedCloudStep,
      selectedCloudMultiplier,
      betsThisRound,
    });
  } catch (error) {
    const status =
      /closed|already|Minimum|Invalid|Insufficient|ready|Maximum|one bet per step|Use step/i.test(
        error.message
      )
        ? 400
        : 500;
    return res.status(status).json({ message: error.message || "Server Error" });
  }
}

export async function getMyCloudSpreadHistory(req, res) {
  try {
    const user = await User.findOne({ userAuthId: req.user.userAuthId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const data = await getCloudSpreadUserHistory(user.userId, 50);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function getLiveCloudSpreadHistory(req, res) {
  try {
    const data = await getCloudSpreadRoundHistory(50, { liveOnly: true });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function cashOutCloudSpread(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { state, alreadySettled } = await cashOutCloudSpreadRound(userId);
    const user = await User.findOne(
      { userId },
      {
        "wallets.eth.privateKey": 0,
        "wallets.bsc.privateKey": 0,
        "wallets.tron.privateKey": 0,
        password: 0,
        country: 0,
        pumpingMode: 0,
        rubicMode: 0,
        partnerId: 0,
        partnerActivity: 0,
        lastClickDate: 0,
        
      }
    );
    return res.status(200).json({
      message: alreadySettled ? "Round already ended" : "Round cashed out",
      state,
      alreadySettled: !!alreadySettled,
      user: user || undefined,
    });
  } catch (error) {
    const status = /Round is not ready/i.test(error.message)
      ? 503
      : /Pay and play|before cash out/i.test(error.message)
        ? 400
        : 500;
    return res.status(status).json({ message: error.message || "Server Error" });
  }
}
