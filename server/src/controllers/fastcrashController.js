import User from "../models/User.js";
import {
  getFastCrashStateSnapshot,
  getFastCrashUserHistory,
  getFastCrashLiveFeed,
  placeFastCrashBet,
  publishFastCrashBetEvent,
} from "../services/fastcrash/fastCrashGame.service.js";

export async function getFastCrashState(req, res) {
  try {
    const state = await getFastCrashStateSnapshot();
    if (!state) return res.status(503).json({ message: "Fast Crash round is not ready" });
    return res.status(200).json(state);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function createFastCrashBet(req, res) {
  try {
    const { amount, side, digit } = req.body;
    const user = await User.findOne({ userAuthId: req.user.userAuthId }).select(
      "userId altas avatar balance totalBet refreshBet totalhistory lotterybet partnerLevel notification fastcrashHistory"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const { row, round, betId, betAmount } = await placeFastCrashBet({ user, amount, side, digit });
    const response = {
      user: {
        userId: user.userId,
        altas: user.altas,
        avatar: user.avatar,
      },
      row,
      balanceDelta: -Number(betAmount ?? amount ?? 0),
      roundId: round.roundId,
      betId,
      betAmount: betAmount ?? amount,
      side,
      digit: digit != null ? Number(digit) : undefined,
    };
    res.status(200).json(response);

    setImmediate(async () => {
      try {
        const ably = req.app.locals.ably;
        await publishFastCrashBetEvent(ably, row, round);
      } catch (publishError) {
        console.error("[fastcrash] publish bet event failed:", publishError);
      }
    });
  } catch (error) {
    const status = /closed|already|Minimum|Maximum|Invalid|Insufficient|ready|Pick/i.test(error.message)
      ? 400
      : 500;
    return res.status(status).json({ message: error.message || "Server Error" });
  }
}

export async function getMyFastCrashHistory(req, res) {
  try {
    const user = await User.findOne({ userAuthId: req.user.userAuthId })
      .select("userId fastcrashHistory")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const data = await getFastCrashUserHistory(user.userId, 50, { embedded: user.fastcrashHistory });
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function getFastCrashLiveHistory(req, res) {
  try {
    const data = await getFastCrashLiveFeed(50);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}
