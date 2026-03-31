import User from "../models/User.js";
import CalendarHash from "../models/hashDice/CalendarHash.js";
import {
  getBaseWinRateForPayout,
  getEffectiveWinRate,
  hashThresholdsFromPayout,
  pickDisplayRoll,
  updateHashMode,
  mustForceLossBeforeBet,
  MIN_PAYOUT,
  MAX_PAYOUT,
} from "../services/hashDice/hashDiceGame.service.js";
import HashDiceSetting from "../models/hashDice/HashDiceSetting.js";
import HashDiceResult from "../models/hashDice/HashDiceResult.js";
import {
  HASH_DICE_RESULTS_STORE_CAP,
  trimHashDiceResultsCollection,
} from "../services/hashDice/hashDiceResult.service.js";

const MIN_BET = 0.1;
const MAX_BET = 20;
const HISTORY_CAP = 500;

function getUserId(req) {
  return req.user?.userId || req.user?._id?.toString() || null;
}

function getUserSelector(req) {
  if (req.user?.userId) return { userId: req.user.userId };
  if (req.user?._id) return { _id: req.user._id };
  return null;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** Stake × payout (e.g. 0.1 × 1.97 = 0.197); avoid round2 which turned 0.197 → 0.20 (looks like 2×). */
function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

/** GET public win-rate bands + mode knobs (for UI). */
export const getHashDiceConfig = async (req, res) => {
  try {
    const doc = await HashDiceSetting.findOne({}).lean();
    if (!doc) {
      return res.status(503).json({ success: false, message: "Hash Dice settings not initialized" });
    }
    return res.json({
      success: true,
      data: {
        winRateBands: doc.winRateBands,
        hashModeEnterProfitRatio: doc.hashModeEnterProfitRatio,
        hashModeExitLossRatio: doc.hashModeExitLossRatio,
        hashModeWinMultTight: doc.hashModeWinMultTight,
        hashModeWinMultSoft: doc.hashModeWinMultSoft,
        hashMinLossEveryNBets: doc.hashMinLossEveryNBets ?? 5,
      },
    });
  } catch (e) {
    console.error("getHashDiceConfig", e);
    return res.status(500).json({ success: false, message: "Failed to load Hash Dice config" });
  }
};

export const getMyHashDiceState = async (req, res) => {
  try {
    const userSelector = getUserSelector(req);
    if (!userSelector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const u = await User.findOne(userSelector)
      .select("hashBetAmount hashWinAmount hashMode hashConsecutiveWins hashHistory balance")
      .lean();
    if (!u) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({
      success: true,
      data: {
        hashBetAmount: u.hashBetAmount ?? 0,
        hashWinAmount: u.hashWinAmount ?? 0,
        hashMode: u.hashMode ?? 0,
        hashConsecutiveWins: u.hashConsecutiveWins ?? 0,
        balance: u.balance,
        history: (u.hashHistory || []).slice(-100).reverse(),
      },
    });
  } catch (e) {
    console.error("getMyHashDiceState", e);
    return res.status(500).json({ success: false, message: "Failed to load state" });
  }
};

/** Public live ticker: latest rounds from `HashDiceResult` (users + bots), same idea as Plinko. */
export const getHashDiceLiveResults = async (_req, res) => {
  try {
    const rows = await HashDiceResult.find()
      .sort({ createdAt: -1 })
      .limit(HASH_DICE_RESULTS_STORE_CAP)
      .lean();
    const data = rows.map((r) => ({
      id: r._id.toString(),
      userId: r.userId,
      user: r.userName,
      avatar: r.avatar,
      betAmount: r.betAmount,
      multiplier: r.multiplier,
      win: r.win,
      profit:
        typeof r.profit === "number" && Number.isFinite(r.profit)
          ? r.profit
          : round2(Number(r.win || 0) - Number(r.betAmount || 0)),
      isBot: r.isBot,
    }));
    return res.json({ success: true, data });
  } catch (e) {
    console.error("getHashDiceLiveResults", e);
    return res.status(500).json({ success: false, message: "Failed to load live results" });
  }
};

/** GET bet history from `user.hashHistory` (matches Plinko /me history pattern). */
export const getMyHashDiceHistory = async (req, res) => {
  try {
    const userSelector = getUserSelector(req);
    if (!userSelector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const user = await User.findOne(userSelector, { hashHistory: { $slice: -limit } }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const history = [...(user.hashHistory || [])].reverse();
    return res.json({ success: true, history });
  } catch (e) {
    console.error("getMyHashDiceHistory", e);
    return res.status(500).json({ success: false, message: "Failed to load history" });
  }
};

/**
 * POST body: { amount, payout, side } side 0 = Low, 1 = High
 */
export const postHashDiceBet = async (req, res) => {
  try {
    const userId = getUserId(req);
    const userSelector = getUserSelector(req);
    if (!userId || !userSelector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const amount = round2(req.body?.amount);
    const payout = round2(req.body?.payout);
    const side = Number(req.body?.side);

    if (!Number.isFinite(amount) || amount < MIN_BET || amount > MAX_BET) {
      return res.status(400).json({
        success: false,
        message: `Bet must be between ${MIN_BET} and ${MAX_BET}`,
      });
    }
    if (!Number.isFinite(payout) || payout < MIN_PAYOUT || payout > MAX_PAYOUT) {
      return res.status(400).json({
        success: false,
        message: `Payout must be between ${MIN_PAYOUT} and ${MAX_PAYOUT}`,
      });
    }
    if (side !== 0 && side !== 1) {
      return res.status(400).json({ success: false, message: "side must be 0 (Low) or 1 (High)" });
    }

    const setting = await HashDiceSetting.findOne({}).lean();
    if (!setting) {
      return res.status(503).json({ success: false, message: "Hash Dice not configured" });
    }

    const user = await User.findOne(userSelector)
      .select("balance hashBetAmount hashWinAmount hashMode hashConsecutiveWins altas avatar")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const bal = Number(user.balance) || 0;
    if (bal < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const baseWinRate = getBaseWinRateForPayout(payout, setting.winRateBands);
    const hashMode = user.hashMode === 1 ? 1 : 0;
    const effectiveWinRate = getEffectiveWinRate(baseWinRate, hashMode, setting);

    const consecutive = Number(user.hashConsecutiveWins) || 0;
    const nLossWindow = setting.hashMinLossEveryNBets ?? 5;
    const forcedLoss = mustForceLossBeforeBet(consecutive, nLossWindow);

    const rand = Math.random();
    const isWin = !forcedLoss && rand < effectiveWinRate;

    const grossWin = isWin ? round4(amount * payout) : 0;
    const profit = round4(grossWin - amount);
    const { lowBelow, highAbove } = hashThresholdsFromPayout(payout);
    const roll = pickDisplayRoll(side, isWin, lowBelow, highAbove);

    const nextStreak = isWin ? consecutive + 1 : 0;

    const histEntry = {
      betAmount: amount,
      payout,
      side,
      roll,
      isWin,
      winAmount: grossWin,
      profit,
      hashMode,
      effectiveWinRate,
      forcedLoss: !!forcedLoss,
      createAt: new Date(),
    };

    const balanceDelta = -amount + grossWin;

    const updateOps = {
      $inc: {
        balance: balanceDelta,
        totalBet: amount,
        refreshBet: amount,
        lotterybet: amount,
        totalEarn: grossWin,
        hashBetAmount: amount,
        hashWinAmount: grossWin,
      },
      $push: {
        hashHistory: {
          $each: [histEntry],
          $slice: -HISTORY_CAP,
        },
      },
      $set: { hashConsecutiveWins: nextStreak },
    };
    if (grossWin > 0) {
      updateOps.$push.totalhistory = {
        amount: grossWin,
        date: new Date(),
        type: "hashDice",
      };
    }
    await User.findOneAndUpdate(userSelector, updateOps);

    await updateHashMode(userSelector);

    const updated = await User.findOne(userSelector)
      .select("hashMode balance hashConsecutiveWins")
      .lean();

    const multDisplay = isWin ? payout : 0;
    let liveRowId = null;
    try {
      const resultDoc = await HashDiceResult.create({
        userId: String(userId),
        userName: user.altas || "",
        avatar: user.avatar || "",
        betAmount: amount,
        multiplier: multDisplay,
        win: grossWin,
        profit,
        payout,
        side,
        roll,
        isBot: false,
      });
      liveRowId = resultDoc._id.toString();
      await trimHashDiceResultsCollection();
      const ably = req.app?.locals?.ablyMiningGames ?? req.app?.locals?.ably;
      if (ably) {
        try {
          const channel = ably.channels.get("hashDiceLive");
          await channel.publish("HASH_DICE_LIVE_ROW", {
            id: liveRowId,
            userId: String(userId),
            user: user.altas || "",
            avatar: user.avatar || "",
            betAmount: amount,
            multiplier: multDisplay,
            win: grossWin,
            profit,
          });
        } catch (pubErr) {
          console.warn("[hash-dice] Ably publish", pubErr?.message || pubErr);
        }
      }
    } catch (err) {
      console.error("[hash-dice] HashDiceResult / trim", err);
    }

    Promise.resolve()
      .then(async () => {
        try {
          await CalendarHash.create({
            userId: String(userId),
            userName: user.altas || "",
            avatar: user.avatar || "",
            betAmount: amount,
            payout,
            side,
            roll,
            isWin,
            winAmount: grossWin,
            profit,
            hashMode,
            effectiveWinRate,
            forcedLoss: !!forcedLoss,
          });
        } catch (err) {
          console.error("[hash-dice] CalendarHash create", err);
        }
      })
      .catch(() => {});

    return res.json({
      success: true,
      data: {
        isWin,
        roll,
        winAmount: grossWin,
        profit,
        payout,
        side,
        lowBelow,
        highAbove,
        baseWinRate,
        effectiveWinRate,
        forcedLoss: !!forcedLoss,
        hashMinLossEveryNBets: nLossWindow,
        hashConsecutiveWins: updated?.hashConsecutiveWins ?? nextStreak,
        hashMode: updated?.hashMode ?? hashMode,
        balance: updated?.balance,
        liveRowId,
      },
    });
  } catch (e) {
    console.error("postHashDiceBet", e);
    return res.status(500).json({ success: false, message: "Bet failed" });
  }
};
