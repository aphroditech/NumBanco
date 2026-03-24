import User from "../models/User.js";
import {
  getGravityRoundHistory,
  getGravityStateSnapshot,
  getGravityUserHistory,
  placeGravityBet,
  publishGravityBetEvent,
} from "../services/gravity/gravityGame.service.js";

export async function getGravityState(req, res) {
  try {
    const state = await getGravityStateSnapshot();
    if (!state) return res.status(503).json({ message: "Gravity round is not ready" });
    return res.status(200).json(state);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function createGravityBet(req, res) {
  try {
    const { amount, direction } = req.body;
    const user = await User.findOne({ userAuthId: req.user.userAuthId }).select(
      "userId altas avatar balance totalBet refreshBet totalhistory partnerLevel notification"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const { row, round, betId, betAmount } = await placeGravityBet({ user, amount, direction });
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
      direction,
    };
    res.status(200).json(response);

    // Do not block response on websocket publication.
    setImmediate(async () => {
      try {
        const ably = req.app.locals.ably;
        await publishGravityBetEvent(ably, row, round);
      } catch (publishError) {
        console.error("[gravity] publish bet event failed:", publishError);
      }
    });
    return;
  } catch (error) {
    const status = /closed|already|Minimum|Invalid|Insufficient|ready/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ message: error.message || "Server Error" });
  }
}

export async function getMyGravityHistory(req, res) {
  try {
    const user = await User.findOne({ userAuthId: req.user.userAuthId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const data = await getGravityUserHistory(user.userId, 50);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}

export async function getLiveGravityHistory(req, res) {
  try {
    const data = await getGravityRoundHistory(30);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}
