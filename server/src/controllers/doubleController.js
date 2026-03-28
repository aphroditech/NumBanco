import User from "../models/User.js";
import {
  getDoubleRoundHistory,
  getDoubleStateSnapshot,
  getDoubleUserHistory,
  placeDoubleBet,
  publishDoubleBetEvent,
} from "../services/double/doubleGame.service.js";

export async function getDoubleState(req, res) {
  try {
    const state = await getDoubleStateSnapshot();
    if (!state) return res.status(503).json({ message: "Double round is not ready" });
    return res.status(200).json(state);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function createDoubleBet(req, res) {
  try {
    const { amount, side } = req.body;
    const user = await User.findOne({ userAuthId: req.user.userAuthId }).select(
      "userId altas avatar balance totalBet refreshBet totalhistory partnerLevel notification"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const { row, round, betId, betAmount } = await placeDoubleBet({ user, amount, side });
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
        await publishDoubleBetEvent(ably, row, round);
      } catch (publishError) {
        console.error("[double] publish bet event failed:", publishError);
      }
    });
  } catch (error) {
    const status = /closed|already|Minimum|Maximum|Invalid|Insufficient|ready/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ message: error.message || "Server Error" });
  }
}

export async function getMyDoubleHistory(req, res) {
  try {
    const user = await User.findOne({ userAuthId: req.user.userAuthId }).select("userId doubleHistory");
    if (!user) return res.status(404).json({ message: "User not found" });
    const data = await getDoubleUserHistory(user.userId, 50, { embedded: user.doubleHistory });
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function getLiveDoubleHistory(req, res) {
  try {
    const data = await getDoubleRoundHistory(40);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}
