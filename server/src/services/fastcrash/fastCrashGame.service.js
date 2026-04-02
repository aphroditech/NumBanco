import crypto from "crypto";
import mongoose from "mongoose";
import FastCrashRound from "../../models/fastcrash/FastCrashRound.js";
import FastCrashHistory from "../../models/fastcrash/FastCrashHistory.js";
import FastCrashSetting from "../../models/fastcrash/FastCrashSetting.js";
import User from "../../models/User.js";

const BETTING_MS = 20000;
const ROLLING_MS = 3000; // New: 3 seconds for the disabled phase
const RESULT_MS = 3000; // 3 seconds for result display

export const PAYOUT_MULT = {
  green: 1.96,
  red: 1.96,
  violet: 4.5,
  number: 9,
};

const CHANNEL_NAME = "fastCrashGame";
export const EVENT_STATE = "FASTCRASH_STATE";
export const EVENT_NEW_BET = "FASTCRASH_NEW_BET";
export const EVENT_RESULT = "FASTCRASH_RESULT";

const PREVIOUS_RESULTS_COUNT = 120;
const FASTCRASH_ROUND_RETENTION = 40;

let loopStarted = false;
let currentRound = null;
let liveUsers = [];
let settled = false;
let advanceMutex = Promise.resolve();
let loopTimer = null;
let loopInFlight = false;
/** @type {{ roundId: number; digit: number; color: string }[]} */
let recentResults = [];
let botUserIds = [];
let lastBotRefreshAt = 0;

function round2(v) {
  return Math.round(Number(v) * 100) / 100;
}

function buildUserNotification(message, status = "success", from = "Fast Crash", to = "") {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    notification: message,
    status,
    from,
    to,
    unread: true,
  };
}

function buildBetId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function deterministicPfpPath(seed) {
  const s = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const idx = (Math.abs(hash) % 15) + 1;
  return `/avatars/pfp${idx}.png`;
}

/** BC-style parity: odd (not 5) → green, even (not 0) → red, 0 and 5 → violet. */
export function resultColorFromDigit(d) {
  const n = Math.floor(Number(d));
  if (n === 0 || n === 5) return "violet";
  if (n % 2 === 1) return "green";
  return "red";
}

function betWins(bet, winningDigit, color) {
  const s = String(bet.side || "").toLowerCase();
  if (s === "number") {
    return Math.floor(Number(bet.digit)) === Math.floor(Number(winningDigit));
  }
  return s === color;
}

function payoutForBet(bet) {
  const s = String(bet.side || "").toLowerCase();
  if (s === "number") return PAYOUT_MULT.number;
  return PAYOUT_MULT[s] ?? 0;
}

async function publish(ably, event, data) {
  if (!ably) return;
  if (ably.connection?.state !== "connected") return;
  const channel = ably.channels.get(CHANNEL_NAME);
  try {
    await channel.publish(event, data);
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[fastcrash] ably publish failed:", err?.code || err?.message || err);
    }
  }
}

function phaseFromRound(round, nowMs = Date.now()) {
  if (!round?.bettingEndsAt) return "betting";
  const betEnd = new Date(round.bettingEndsAt).getTime();
  
  if (nowMs < betEnd) return "betting";

  const rollingEnd = betEnd + ROLLING_MS;
  if (nowMs < rollingEnd) return "rolling";

  // If we have a winning digit, we are in the result phase until roundEndsAt
  if (round.winningDigit != null) {
    if (!round.roundEndsAt) return "result";
    const roundEnd = new Date(round.roundEndsAt).getTime();
    if (nowMs < roundEnd) return "result";
    return "closed";
  }

  // If no winning digit yet, we must be in rolling (or waiting for reveal)
  return "rolling";
}

async function loadRecentResultsFromDb(limit = PREVIOUS_RESULTS_COUNT) {
  const rows = await FastCrashRound.find(
    {
      winningDigit: { $exists: true, $ne: null },
      resultColor: { $exists: true, $ne: null },
    },
    { _id: 0, roundId: 1, winningDigit: 1, resultColor: 1 }
  )
    .sort({ roundId: -1 })
    .limit(limit)
    .lean();
  return (rows || []).map((r) => ({
    roundId: r.roundId,
    digit: r.winningDigit,
    color: r.resultColor,
  }));
}

async function enforceRoundRetention() {
  const latestRounds = await FastCrashRound.find({}, { _id: 0, roundId: 1 })
    .sort({ roundId: -1 })
    .limit(FASTCRASH_ROUND_RETENTION)
    .lean();
  const keep = new Set();
  for (const r of latestRounds || []) keep.add(r.roundId);
  if (keep.size === 0) return;
  await FastCrashRound.deleteMany({ roundId: { $nin: Array.from(keep) } });
}

async function createRound() {
  const latest = await FastCrashRound.findOne({}).sort({ roundId: -1 });
  const roundId = latest?.roundId ? latest.roundId + 1 : 1;
  const now = new Date();
  const bettingEndsAt = new Date(now.getTime() + BETTING_MS);
  const roundEndsAt = new Date(bettingEndsAt.getTime() + ROLLING_MS + RESULT_MS);

  const round = await FastCrashRound.create({
    roundId,
    phase: "betting",
    startAt: now,
    bettingEndsAt,
    roundEndsAt, // New: Added roundEndsAt
    users: [],
  });

  enforceRoundRetention().catch((e) => {
    console.warn("[fastcrash] retention cleanup failed:", e?.message || e);
  });

  liveUsers = [];
  settled = false;
  currentRound = round.toObject ? round.toObject() : round;
  return currentRound;
}

export async function getFastCrashStateSnapshot() {
  if (!currentRound) return null;
  const nowMs = Date.now();
  const phase = phaseFromRound(currentRound, nowMs);

  let timeLeftMs = 0;
  const betEnd = new Date(currentRound.bettingEndsAt).getTime();
  if (phase === "betting") timeLeftMs = Math.max(0, betEnd - nowMs);
  else if (phase === "rolling") {
    timeLeftMs = Math.max(0, (betEnd + ROLLING_MS) - nowMs);
  }
  else if (phase === "result" && currentRound.roundEndsAt) {
    timeLeftMs = Math.max(0, new Date(currentRound.roundEndsAt).getTime() - nowMs);
  }

  const showDigit = phase !== "betting" && currentRound.winningDigit != null;

  return {
    roundId: currentRound.roundId,
    phase,
    serverNow: nowMs,
    timeLeftMs,
    winningDigit: showDigit ? currentRound.winningDigit : null,
    resultColor: showDigit ? currentRound.resultColor : null,
    bettingEndsAt: currentRound.bettingEndsAt,
    roundEndsAt: currentRound.roundEndsAt || null,
    greenTotalBet: currentRound.greenTotalBet || 0,
    redTotalBet: currentRound.redTotalBet || 0,
    violetTotalBet: currentRound.violetTotalBet || 0,
    numberTotalBet: currentRound.numberTotalBet || 0,
    liveUsers: [...liveUsers],
    recentResults: [...recentResults],
    payouts: { ...PAYOUT_MULT },
    timers: {
      bettingSeconds: BETTING_MS / 1000,
      rollingSeconds: ROLLING_MS / 1000, // New: Rolling seconds
      resultSeconds: RESULT_MS / 1000,
    },
  };
}

export async function placeFastCrashBet({ user, amount, side, digit }) {
  if (!currentRound) throw new Error("Round is not ready");
  const phase = phaseFromRound(currentRound);
  if (phase !== "betting") throw new Error("Betting phase is closed");

  const isBot = Number(user.partnerLevel ?? 1) === 0;
  const parsedAmount = round2(Number(amount));
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0.0001) {
    throw new Error("Minimum amount is 0.0001");
  }

  const s = String(side || "").toLowerCase();
  if (!["green", "red", "violet", "number"].includes(s)) {
    throw new Error("Invalid side");
  }

  let d = null;
  if (s === "number") {
    d = Math.floor(Number(digit));
    if (!Number.isFinite(d) || d < 0 || d > 9) {
      throw new Error("Pick a number from 0 to 9");
    }
  }

  if (!isBot && user.balance < parsedAmount) {
    throw new Error("Insufficient balance");
  }

  const exists = Array.isArray(currentRound.users)
    ? currentRound.users.some((b) => String(b.userId) === String(user.userId))
    : false;
  if (exists) throw new Error("You already placed a bet in this round");

  let storedBetId;
  if (isBot) {
    storedBetId = String(buildBetId());
  } else {
    const entryId = new mongoose.Types.ObjectId();
    const betPlacedAt = new Date();
    await FastCrashHistory.create({
      _id: entryId,
      userId: String(user.userId),
      roundId: currentRound.roundId,
      userName: user.altas || "",
      avatar: user.avatar || "",
      side: s,
      digit: d,
      betAmount: parsedAmount,
      winAmount: 0,
      createAt: betPlacedAt,
    });
    try {
      const up = await User.updateOne(
        { userId: user.userId },
        {
          $inc: {
            balance: -parsedAmount,
            totalBet: parsedAmount,
            refreshBet: parsedAmount,
            lotterybet: parsedAmount,
          },
          $push: {
            totalhistory: {
              amount: -parsedAmount,
              date: new Date(),
              type: "fastcrash",
            },
            fastcrashHistory: {
              _id: entryId,
              roundId: currentRound.roundId,
              userName: user.altas || "",
              avatar: user.avatar || "",
              side: s,
              digit: d,
              betAmount: parsedAmount,
              winAmount: 0,
              createAt: betPlacedAt,
            },
            notification: buildUserNotification(
              `Bet placed $${parsedAmount.toFixed(4)} on ${currentRound.roundId} (${s}${d != null ? ` ${d}` : ""})`,
              "success",
              "Fast Crash",
              user.userId
            ),
          },
        }
      );
      if (up.matchedCount === 0) {
        await FastCrashHistory.deleteOne({ _id: entryId });
        throw new Error("User not found");
      }
    } catch (err) {
      await FastCrashHistory.deleteOne({ _id: entryId }).catch(() => {});
      throw err;
    }
    storedBetId = String(entryId);
  }

  const roundInc = {};
  if (s === "green") roundInc.greenTotalBet = parsedAmount;
  if (s === "red") roundInc.redTotalBet = parsedAmount;
  if (s === "violet") roundInc.violetTotalBet = parsedAmount;
  if (s === "number") roundInc.numberTotalBet = parsedAmount;

  const newUserBet = {
    betId: storedBetId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    side: s,
    digit: d,
    betAmount: parsedAmount,
    isBot,
  };

  // Update the database and retrieve the updated round document
  const updatedRoundDoc = await FastCrashRound.findOneAndUpdate(
    { _id: currentRound._id },
    {
      ...(Object.keys(roundInc).length ? { $inc: roundInc } : {}),
      $push: { users: newUserBet },
    },
    { new: true } // Return the modified document rather than the original
  );

  if (updatedRoundDoc) {
    currentRound = updatedRoundDoc.toObject ? updatedRoundDoc.toObject() : updatedRoundDoc; // Refresh global currentRound
  } else {
    // This scenario indicates a problem: the round was not found for update.
    console.error(`[fastcrash] Error: currentRound (id: ${currentRound._id}) not found for bet update.`);
    throw new Error("Failed to update round with new bet.");
  }

  if (s === "green") currentRound.greenTotalBet = round2((currentRound.greenTotalBet || 0) + parsedAmount);
  if (s === "red") currentRound.redTotalBet = round2((currentRound.redTotalBet || 0) + parsedAmount);
  if (s === "violet") currentRound.violetTotalBet = round2((currentRound.violetTotalBet || 0) + parsedAmount);
  if (s === "number") currentRound.numberTotalBet = round2((currentRound.numberTotalBet || 0) + parsedAmount);

  const trimmedAvatar = user.avatar == null ? "" : String(user.avatar).trim();
  const rowAvatar =
    isBot || !trimmedAvatar ? deterministicPfpPath(user.userId || user.altas) : trimmedAvatar;

  const row = {
    userName: user.altas,
    avatar: rowAvatar,
    amount: parsedAmount,
    side: s,
    digit: d,
    userId: user.userId,
    betId: storedBetId,
    isBot,
  };
  liveUsers = [row, ...liveUsers];

  return { row, round: currentRound, betId: storedBetId, betAmount: parsedAmount };
}

export async function publishFastCrashBetEvent(ably, row, round) {
  await publish(ably, EVENT_NEW_BET, {
    roundId: round.roundId,
    ...row,
    greenTotalBet: round.greenTotalBet || 0,
    redTotalBet: round.redTotalBet || 0,
    violetTotalBet: round.violetTotalBet || 0,
    numberTotalBet: round.numberTotalBet || 0,
  });
}

function plainEmbeddedEntry(e) {
  if (e == null) return e;
  if (typeof e.toObject === "function") return e.toObject({ virtuals: false });
  return e;
}

export async function getFastCrashUserHistory(userId, limit = 50, options = {}) {
  const cap = Math.min(Math.max(1, Number(limit) || 50), 200);
  const uid = String(userId);
  let list;
  if (Array.isArray(options.embedded)) {
    list = options.embedded.map(plainEmbeddedEntry);
  } else {
    const user = await User.findOne({ userId: uid }).select("fastcrashHistory").lean();
    list = Array.isArray(user?.fastcrashHistory) ? [...user.fastcrashHistory] : [];
  }
  list.sort((a, b) => {
    const ta = new Date(a.createAt ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.createAt ?? b.createdAt ?? 0).getTime();
    return tb - ta;
  });
  return list.slice(0, cap).map((e) => {
    const p = plainEmbeddedEntry(e);
    return {
      ...p,
      _id: p._id,
      userId: uid,
      createdAt: p.createAt ?? p.createdAt,
    };
  });
}

export async function getFastCrashLiveFeed(limit = 50) {
  const cap = Math.min(Math.max(1, Number(limit) || 50), 200);
  const rows = await FastCrashHistory.find({})
    .sort({ createAt: -1 })
    .limit(cap)
    .lean();
  return rows.map((e) => ({
    _id: e._id,
    roundId: e.roundId,
    userId: e.userId,
    userName: e.userName,
    avatar: e.avatar,
    side: e.side,
    digit: e.digit,
    betAmount: e.betAmount,
    winAmount: e.winAmount,
    winningDigit: e.winningDigit,
    resultColor: e.resultColor,
    createdAt: e.createAt ?? e.createdAt,
  }));
}

async function settleRound(ably) {
  if (!currentRound || settled) return;
  const round = currentRound;
  const winningDigit = round.winningDigit;
  const resultColor = round.resultColor;
  if (winningDigit == null || !resultColor) {
    console.warn("[fastcrash] settle skipped: missing outcome");
    return;
  }
  settled = true;

  round.phase = "result";
  currentRound.phase = "result";
  await FastCrashRound.updateOne({ _id: round._id }, { $set: { phase: "result" } });

  const bets = Array.isArray(round.users) ? round.users : [];

  for (const bet of bets) {
    const isWin = betWins(bet, winningDigit, resultColor);
    const mult = payoutForBet(bet);
    const winAmount = isWin ? round2(bet.betAmount * mult) : 0;
    const user = await User.findOne({ userId: bet.userId });
    if (!user || bet.isBot) continue;

    if (winAmount > 0) {
      user.balance = round2(user.balance + winAmount);
      user.totalEarn = round2((user.totalEarn || 0) + winAmount);
      user.notification.push(
        buildUserNotification(
          `Won $${winAmount.toFixed(4)} on ${round.roundId} — ${winningDigit} (${resultColor})`,
          "success",
          "Fast Crash",
          user.userId
        )
      );
    }

    user.totalhistory.push({
      amount: winAmount > 0 ? winAmount : -bet.betAmount,
      date: new Date(),
      type: "fastcrash",
    });

    if (bet.betId && mongoose.isValidObjectId(bet.betId)) {
      const betOid = new mongoose.Types.ObjectId(bet.betId);
      await FastCrashHistory.updateOne(
        { _id: betOid, userId: String(bet.userId) },
        {
          $set: {
            winAmount,
            winningDigit,
            resultColor,
          },
        }
      );
      const dhSub = user.fastcrashHistory?.id?.(betOid);
      if (dhSub) {
        dhSub.winAmount = winAmount;
        dhSub.winningDigit = winningDigit;
        dhSub.resultColor = resultColor;
      }
    }
    await user.save();
  }

  recentResults.unshift({
    roundId: round.roundId,
    digit: winningDigit,
    color: resultColor,
  });
  recentResults = recentResults.slice(0, PREVIOUS_RESULTS_COUNT);

  await publish(ably, EVENT_RESULT, {
    roundId: round.roundId,
    winningDigit,
    resultColor,
    phase: "result",
    greenTotalBet: round.greenTotalBet || 0,
    redTotalBet: round.redTotalBet || 0,
    violetTotalBet: round.violetTotalBet || 0,
    numberTotalBet: round.numberTotalBet || 0,
    payouts: { ...PAYOUT_MULT },
  });

  await enforceRoundRetention();
}

async function revealAndSettle(ably, roundIdForTimers) {
  if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
  if (currentRound.winningDigit != null) return;

  const bets = Array.isArray(currentRound.users) ? currentRound.users : [];
  
  // A = Green, B = Violet, C = Red (Only real user bets)
  let A = 0;
  let B = 0;
  let C = 0;
  let totalNumberBets = 0;
  const digitBets = new Array(10).fill(0);

  for (const b of bets) {
    if (b.isBot) continue;

    const amt = Number(b.betAmount || 0);
    if (b.side === "green") A += amt;
    else if (b.side === "violet") B += amt;
    else if (b.side === "red") C += amt;
    else if (b.side === "number" && b.digit != null) {
      const d = Math.floor(Number(b.digit));
      if (d >= 0 && d <= 9) {
        digitBets[d] += amt;
        totalNumberBets += amt;
      }
    }
  }

  // Fetch win rate from DB settings
  let winRate = 0.4;
  try {
    const settings = await FastCrashSetting.findOne({ key: "default" });
    if (settings) winRate = settings.winRate40;
  } catch (err) {
    console.warn("[fastcrash] failed to fetch settings:", err.message);
  }

  const D = totalNumberBets * 0.1;
  let winningColor;
  const roll = Math.random();

  console.log("winrate", winRate);
  if (A > C && A > (2 * C + 4.5 * B)) {
    // A is too high: B & C share winRate (40% by default)
    if (roll < winRate) {
      winningColor = Math.random() < 0.5 ? "violet" : "red";
    } else {
      winningColor = "green";
    }
  } else if (C > A && C > (2 * A + 4.5 * B)) {
    // C is too high: B & A share winRate (40% by default)
    if (roll < winRate) {
      winningColor = Math.random() < 0.5 ? "violet" : "green";
    } else {
      winningColor = "red";
    }
  } else {
    // Standard balancing: pick the side with fewer bets
    if (A > C) winningColor = "red";
    else if (C > A) winningColor = "green";
    else winningColor = Math.random() < 0.5 ? "green" : "red";
  }

  // Define digit pools for each color
  const colorPools = {
    violet: [0, 5],
    green: [1, 3, 7, 9],
    red: [2, 4, 6, 8],
  };

  const pool = colorPools[winningColor];
  
  // Find winning digit: less than D but nearest to D
  let winningDigit = null;
  let bestDiff = Infinity;

  // Only attempt the D logic if there are actual user number bets
  if (totalNumberBets > 0) {
    for (const d of pool) {
      const bet = digitBets[d];
      if (bet < D) {
        const diff = D - bet;
        if (diff < bestDiff) {
          bestDiff = diff;
          winningDigit = d;
        }
      }
    }
  }

  // Fallback: If no digit meets the D criteria (or no user bets),
  // pick a random digit from the winning color's pool to ensure variety.
  if (winningDigit === null) {
    winningDigit = pool[Math.floor(Math.random() * pool.length)];
  }

  const resultColor = resultColorFromDigit(winningDigit);
  const roundEndsAt = new Date(Date.now() + RESULT_MS);

  currentRound.winningDigit = winningDigit;
  currentRound.resultColor = resultColor;
  currentRound.roundEndsAt = roundEndsAt;
  currentRound.phase = "result";

  await FastCrashRound.updateOne(
    { _id: currentRound._id },
    {
      $set: {
        winningDigit,
        resultColor,
        roundEndsAt,
        phase: "result",
      },
    }
  );

  await publish(ably, EVENT_STATE, await getFastCrashStateSnapshot());

  try {
    await settleRound(ably);
  } catch (e) {
    console.error("[fastcrash] settle error:", e?.message || e);
  }

  const delayAdvance = Math.max(0, roundEndsAt.getTime() - Date.now());
  const docId = String(currentRound._id);
  setTimeout(async () => {
    await closeRoundAndAdvance(ably, roundIdForTimers, docId);
  }, delayAdvance);
}

async function closeRoundAndAdvance(ably, roundIdForTimers, roundDocIdStr) {
  const result = advanceMutex.then(async () => {
    if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
    if (String(currentRound._id) !== roundDocIdStr) return;

    // Mark previous round as closed
    await FastCrashRound.updateOne({ _id: currentRound._id }, { $set: { phase: "closed" } });

    // Create and schedule the next round
    currentRound = await createRound();
    settled = false;
    scheduleRoundTimers(ably, currentRound);
    await publish(ably, EVENT_STATE, await getFastCrashStateSnapshot());
  });
  advanceMutex = result.catch(() => {});
  await result;
}

function scheduleRoundTimers(ably, roundForTimers) {
  if (!roundForTimers?.bettingEndsAt) return;
  const roundIdForTimers = roundForTimers.roundId;
  const betEnd = new Date(roundForTimers.bettingEndsAt).getTime();

  // Schedule a state update when betting ends to signal the rolling phase
  const delayRolling = Math.max(0, betEnd - Date.now());
  setTimeout(async () => {
    if (currentRound && currentRound.roundId === roundIdForTimers) {
      await publish(ably, EVENT_STATE, await getFastCrashStateSnapshot());
    }
  }, delayRolling);

  // Schedule revealAndSettle to run after BETTING_MS + ROLLING_MS
  const delayReveal = Math.max(0, (betEnd + ROLLING_MS) - Date.now());
  setTimeout(async () => {
    try {
      await revealAndSettle(ably, roundIdForTimers);
    } catch (e) {
      console.error("[fastcrash] reveal error:", e?.message || e);
    }
  }, delayReveal);
}

async function maybeRunBots(ably) {
  if (!currentRound) return;
  if (phaseFromRound(currentRound) !== "betting") return;

  // Fetch bot settings from DB
  let settings = {
    botMaxPerTick: 6,
    botMinBet: 0.1,
    botMaxBet: 20,
    botGreenWeight: 40,
    botRedWeight: 40,
    botVioletWeight: 10,
    botNumberWeight: 10,
  };

  try {
    const dbSettings = await FastCrashSetting.findOne({ key: "default" });
    if (dbSettings) {
      settings = {
        botMaxPerTick: dbSettings.botMaxPerTick ?? 6,
        botMinBet: dbSettings.botMinBet ?? 0.1,
        botMaxBet: dbSettings.botMaxBet ?? 20,
        botGreenWeight: dbSettings.botGreenWeight ?? 40,
        botRedWeight: dbSettings.botRedWeight ?? 40,
        botVioletWeight: dbSettings.botVioletWeight ?? 10,
        botNumberWeight: dbSettings.botNumberWeight ?? 10,
      };
    }
  } catch (err) {
    console.warn("[fastcrash] failed to fetch bot settings:", err.message);
  }

  const totalWeight = settings.botGreenWeight + settings.botRedWeight + settings.botVioletWeight + settings.botNumberWeight;
  let placed = 0;

  for (let i = 0; i < 24 && placed < settings.botMaxPerTick; i += 1) {
    const botUserId = botUserIds[Math.floor(Math.random() * botUserIds.length)]?.userId;
    if (!botUserId) break;
    const botUser = await User.findOne({ userId: botUserId });
    if (!botUser) continue;

    // Weighted side selection
    const roll = Math.random() * totalWeight;
    let side;
    if (roll < settings.botGreenWeight) side = "green";
    else if (roll < settings.botGreenWeight + settings.botRedWeight) side = "red";
    else if (roll < settings.botGreenWeight + settings.botRedWeight + settings.botVioletWeight) side = "violet";
    else side = "number";

    const digit = side === "number" ? crypto.randomInt(0, 10) : undefined;
    const lo = settings.botMinBet;
    const hi = Math.min(settings.botMaxBet, Number(botUser.balance ?? 0));
    if (hi < lo) continue;

    const amount = round2(lo + Math.random() * (hi - lo));
    try {
      const { row, round } = await placeFastCrashBet({ user: botUser, amount, side, digit });
      placed += 1;
      await publishFastCrashBetEvent(ably, row, round);
    } catch {
      // ignore
    }
  }
}

export async function startFastCrashGameLoop(ably) {
  if (loopStarted) return;
  loopStarted = true;

  // Initialize default settings if not exists
  try {
    const existing = await FastCrashSetting.findOne({ key: "default" });
    if (!existing) {
      await FastCrashSetting.create({ 
        key: "default", 
        winRate40: 0.4,
        botMaxPerTick: 6,
        botMinBet: 0.1,
        botMaxBet: 20,
        botGreenWeight: 40,
        botRedWeight: 40,
        botVioletWeight: 10,
        botNumberWeight: 10
      });
      console.log("[fastcrash] Default settings initialized.");
    }
  } catch (err) {
    console.warn("[fastcrash] failed to initialize settings:", err.message);
  }

  try {
    recentResults = await loadRecentResultsFromDb(PREVIOUS_RESULTS_COUNT);
  } catch (err) {
    console.error("[fastcrash] failed to load recent results:", err);
    recentResults = [];
  }

  try {
    botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
  } catch {
    botUserIds = [];
  }

  // Check if there is an active round before creating a new one
  const latest = await FastCrashRound.findOne({}).sort({ roundId: -1 });
  
  const now = Date.now();
  const isExpired = latest?.roundEndsAt && new Date(latest.roundEndsAt).getTime() < now;

  if (latest && !isExpired && (latest.phase === "betting" || latest.phase === "rolling" || latest.phase === "result")) {
    currentRound = latest.toObject ? latest.toObject() : latest;
    settled = currentRound.phase === "result" && currentRound.winningDigit != null;
  } else {
    currentRound = await createRound();
    settled = false;
  }
  
  scheduleRoundTimers(ably, currentRound);
  await publish(ably, EVENT_STATE, await getFastCrashStateSnapshot());

  if (loopTimer) clearInterval(loopTimer);
  loopTimer = setInterval(async () => {
    if (loopInFlight) return;
    loopInFlight = true;
    try {
      if (!currentRound) return;
      const now = Date.now();
      if (now - lastBotRefreshAt > 10000) {
        lastBotRefreshAt = now;
        try {
          botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
        } catch {}
      }
      await maybeRunBots(ably);
    } catch (e) {
      console.error("[fastcrash] bot loop error:", e?.message || e);
    } finally {
      loopInFlight = false;
    }
  }, 500);
}
