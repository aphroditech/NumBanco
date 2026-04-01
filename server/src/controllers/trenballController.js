import User from "../models/User.js";
import {
  getTrenballStateSnapshot,
  getTrenballUserHistory,
  getTrenballLiveFeed,
  placeTrenballBet,
  publishTrenballBetEvent,
} from "../services/trenball/trenballGame.service.js";

export async function getTrenballState(req, res) {
  try {
    const state = await getTrenballStateSnapshot();
    if (!state) return res.status(503).json({ message: "Trenball round is not ready" });
    return res.status(200).json(state);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function createTrenballBet(req, res) {
  try {
    const { amount, side } = req.body;
    const user = await User.findOne({ userAuthId: req.user.userAuthId }).select(
      "userId altas avatar balance totalBet refreshBet totalhistory lotterybet partnerLevel notification trenballHistory"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const { row, round, betId, betAmount } = await placeTrenballBet({ user, amount, side });
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
    };
    res.status(200).json(response);

    setImmediate(async () => {
      try {
        const ably = req.app.locals.ably;
        await publishTrenballBetEvent(ably, row, round);
      } catch (publishError) {
        console.error("[trenball] publish bet event failed:", publishError);
      }
    });
  } catch (error) {
    const status = /closed|already|Minimum|Maximum|Invalid|Insufficient|ready/i.test(error.message)
      ? 400
      : 500;
    return res.status(status).json({ message: error.message || "Server Error" });
  }
}

export async function getMyTrenballHistory(req, res) {
  try {
    const user = await User.findOne({ userAuthId: req.user.userAuthId })
      .select("userId trenballHistory")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const data = await getTrenballUserHistory(user.userId, 50, { embedded: user.trenballHistory });
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function getTrenballLiveHistory(req, res) {
  try {
    const data = await getTrenballLiveFeed(50);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}
