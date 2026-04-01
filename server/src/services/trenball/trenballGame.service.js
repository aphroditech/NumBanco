import crypto from "crypto";
import mongoose from "mongoose";
import TrenballRound from "../../models/trenball/TrenballRound.js";
import TrenballHistory from "../../models/trenball/TrenballHistory.js";
import TrenballBotSettings from "../../models/trenball/TrenballBotSettings.js";
import User from "../../models/User.js";

const BETTING_MS = 6000;
const RESULT_MS = 4000;

const CHANNEL_NAME = "trenballGame";
export const EVENT_STATE = "TRENBALL_STATE";
export const EVENT_NEW_BET = "TRENBALL_NEW_BET";
export const EVENT_RESULT = "TRENBALL_RESULT";

/** Display payouts (BC.Game–style fixed odds). */
const PAYOUT_MULT = {
  crash: 49.99,
  red: 1.96,
  green: 2,
  moon: 10,
};

const PREVIOUS_RESULTS_COUNT = 200;
const TRENBALL_ROUND_RETENTION_COUNT = 30;

/**
 * Curve: `multiplier = exp(A * t^P)` with `t` in seconds.
 * Inverse (run end): `t = (ln(M)/A)^(1/P)`.
 */
const MULT_A = 0.025;
const MULT_P = 1.3;

let loopStarted = false;
let currentRound = null;
let liveUsers = [];
let settled = false;
let advanceMutex = Promise.resolve();
let loopTimer = null;
let loopInFlight = false;
/** @type {{ roundId: number; crashMultiplier: number; outcome: string }[]} */
let recentResults = [];
let trenballBotConfig = null;
let botUserIds = [];
let lastBotRefreshAt = 0;
let trenballRoundBotPlan = null;

function round2(v) {
  return Math.round(Number(v) * 100) / 100;
}

function buildUserNotification(message, status = "success", from = "Trenball", to = "") {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    notification: message,
    status,
    from,
    to,
    unread: true,
  };
}

function randomIntInclusive(lo, hi) {
  const a = Math.ceil(Number(lo));
  const b = Math.floor(Number(hi));
  const lo2 = Number.isFinite(a) && Number.isFinite(b) ? Math.min(a, b) : 0;
  const hi2 = Number.isFinite(a) && Number.isFinite(b) ? Math.max(a, b) : 0;
  if (hi2 < lo2) return lo2;
  return lo2 + Math.floor(Math.random() * (hi2 - lo2 + 1));
}

function randomUniformBet2(min, max) {
  const lo = Math.min(Number(min), Number(max));
  const hi = Math.max(Number(min), Number(max));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0.1;
  const v = lo + Math.random() * (hi - lo);
  return round2(Math.max(0.1, v));
}

function randomInRange(min, max) {
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 1;
  return lo + Math.random() * (hi - lo);
}

function sampleFallbackCrashMultiplier() {
  const max = 2 ** 32;
  const h = crypto.randomInt(1, max);
  const r = h / max;
  const edge = 0.99;
  let m = edge / (1 - r);
  m = Math.floor(m * 100) / 100;
  if (m < 1.01) m = 1.01;
  return Math.min(m, 500_000);
}

function sampleCrashMultiplierByBets(round, cfg) {
  // A/B/C/D requested by user.
  const A = Number(round?.crashTotalBet || 0);
  const B = Number(round?.redTotalBet || 0);
  const C = Number(round?.greenTotalBet || 0);
  const D = Number(round?.moonTotalBet || 0);

  const left = A + B;
  const right = C + D;

  const moonChance = Math.max(0, Math.min(100, Number(cfg?.moonChancePercent ?? 10))) / 100;
  const instantChance = Math.max(0, Math.min(100, Number(cfg?.instantCrashChancePercent ?? 2))) / 100;

  // A+B > C+D
  if (left > right) {
    // if C*2 + 10*D < A+B then moon rate is 10% (configurable), otherwise green range.
    if (C * 2 + 10 * D < left && Math.random() < moonChance) {
      return round2(randomInRange(10, 40)); // moon (>10x)
    }
    return round2(randomInRange(2.01, 9.99)); // green (>2x && <10x)
  }

  // A+B < C+D
  if (left < right) {
    // if A*50 < B+C+D then 1.00x has 2% chance (configurable), otherwise red range.
    if (A * 50 < B + C + D && Math.random() < instantChance) {
      return 1.0;
    }
    return round2(randomInRange(1.01, 1.99)); // red (>1x && <2x)
  }

  // A+B === C+D -> red side win request (>1x && <2x).
  return round2(randomInRange(1.01, 1.99));
}

function getDefaultTrenballBotConfig() {
  return {
    enabled: true,
    crashBotsMin: 1,
    crashBotsMax: 3,
    redBotsMin: 3,
    redBotsMax: 7,
    greenBotsMin: 3,
    greenBotsMax: 7,
    moonBotsMin: 0,
    moonBotsMax: 2,
    crashBetMinAmount: 0.1,
    crashBetMaxAmount: 5,
    redBetMinAmount: 0.1,
    redBetMaxAmount: 20,
    greenBetMinAmount: 0.1,
    greenBetMaxAmount: 20,
    moonBetMinAmount: 0.1,
    moonBetMaxAmount: 10,
    moonChancePercent: 10,
    instantCrashChancePercent: 2,
  };
}

function ensureTrenballRoundBotPlan(roundId, cfg) {
  if (trenballRoundBotPlan?.roundId === roundId) return;
  trenballRoundBotPlan = {
    roundId,
    target: {
      crash: randomIntInclusive(cfg.crashBotsMin, cfg.crashBotsMax),
      red: randomIntInclusive(cfg.redBotsMin, cfg.redBotsMax),
      green: randomIntInclusive(cfg.greenBotsMin, cfg.greenBotsMax),
      moon: randomIntInclusive(cfg.moonBotsMin, cfg.moonBotsMax),
    },
    placed: { crash: 0, red: 0, green: 0, moon: 0 },
  };
}

function sampleBotUserId() {
  if (!Array.isArray(botUserIds) || botUserIds.length === 0) return null;
  const idx = Math.floor(Math.random() * botUserIds.length);
  return botUserIds[idx]?.userId ?? null;
}

export function outcomeFromMultiplier(mult) {
  const x = round2(mult);
  if (x <= 1) return "crash";
  if (x < 2) return "red";
  if (x < 10) return "green";
  return "moon";
}

function runDurationMs(mult) {
  const m = Number(mult) || 1;
  if (m <= 1) return 900;
  const ln = Math.log(m);
  const tSec = Math.pow(Math.max(0, ln) / MULT_A, 1 / MULT_P);
  const ms = Math.round(tSec * 1000);
  return Math.min(120_000, Math.max(50, ms));
}

function displayedMultiplierAt(nowMs, round) {
  if (!round?.crashMultiplier || !round.runStartedAt || !round.runEndsAt) return 1;
  const M = Number(round.crashMultiplier);
  const rs = new Date(round.runStartedAt).getTime();
  const re = new Date(round.runEndsAt).getTime();
  if (nowMs <= rs) return 1;
  if (nowMs >= re) return round2(M);
  if (M <= 1) return 1;
  const elapsedSec = (nowMs - rs) / 1000;
  const v = Math.exp(MULT_A * Math.pow(Math.max(0, elapsedSec), MULT_P));
  return round2(Math.min(v, M));
}

function phaseFromRound(round, nowMs = Date.now()) {
  if (!round?.bettingEndsAt) return "betting";
  const betEnd = new Date(round.bettingEndsAt).getTime();
  if (nowMs < betEnd) return "betting";
  if (!round.runEndsAt || !round.roundEndsAt) return "betting";
  const runEnd = new Date(round.runEndsAt).getTime();
  const roundEnd = new Date(round.roundEndsAt).getTime();
  if (nowMs < runEnd) return "running";
  if (nowMs < roundEnd) return "result";
  return "closed";
}

async function publish(ably, event, data) {
  if (!ably) return;
  if (ably.connection?.state !== "connected") return;
  const channel = ably.channels.get(CHANNEL_NAME);
  try {
    await channel.publish(event, data);
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[trenball] ably publish failed:", err?.code || err?.message || err);
    }
  }
}

async function loadRecentResultsFromDb(limit = PREVIOUS_RESULTS_COUNT) {
  const rows = await TrenballRound.find(
    {
      phase: { $in: ["result", "closed"] },
      crashMultiplier: { $exists: true, $ne: null },
      outcome: { $exists: true, $ne: null },
    },
    { _id: 0, roundId: 1, crashMultiplier: 1, outcome: 1 }
  )
    .sort({ roundId: -1 })
    .limit(limit)
    .lean();
  return (rows || []).map((r) => ({
    roundId: r.roundId,
    crashMultiplier: round2(r.crashMultiplier),
    outcome: r.outcome,
  }));
}

async function enforceTrenballRoundRetention() {
  // Keep only the latest N TrenballRound rows, delete older ones.
  const latestRounds = await TrenballRound.find({}, { _id: 0, roundId: 1 })
    .sort({ roundId: -1 })
    .limit(TRENBALL_ROUND_RETENTION_COUNT)
    .lean();

  const keep = new Set();
  for (const r of latestRounds || []) keep.add(r.roundId);
  if (keep.size === 0) return;
  await TrenballRound.deleteMany({ roundId: { $nin: Array.from(keep) } });
}

function buildBetId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

/** Public path served by the SPA (`client/public/avatars`). */
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

async function createRound() {
  const latest = await TrenballRound.findOne({}).sort({ roundId: -1 });
  const roundId = latest?.roundId ? latest.roundId + 1 : 1;
  const now = new Date();
  const bettingEndsAt = new Date(now.getTime() + BETTING_MS);

  const round = await TrenballRound.create({
    roundId,
    phase: "betting",
    startAt: now,
    bettingEndsAt,
    users: [],
  });

  enforceTrenballRoundRetention().catch((e) => {
    console.warn("[trenball] retention cleanup failed:", e?.message || e);
  });

  liveUsers = [];
  settled = false;
  trenballRoundBotPlan = null;
  currentRound = round.toObject ? round.toObject() : round;
  return currentRound;
}

export async function getTrenballStateSnapshot() {
  if (!currentRound) return null;
  const nowMs = Date.now();
  const phase = phaseFromRound(currentRound, nowMs);
  const mult = displayedMultiplierAt(nowMs, currentRound);

  let timeLeftMs = 0;
  const betEnd = new Date(currentRound.bettingEndsAt).getTime();
  if (phase === "betting") timeLeftMs = Math.max(0, betEnd - nowMs);
  else if (phase === "running" && currentRound.runEndsAt) {
    timeLeftMs = Math.max(0, new Date(currentRound.runEndsAt).getTime() - nowMs);
  } else if (phase === "result" && currentRound.roundEndsAt) {
    timeLeftMs = Math.max(0, new Date(currentRound.roundEndsAt).getTime() - nowMs);
  }

  const showCrash = phase === "running" || phase === "result" || phase === "closed";

  return {
    roundId: currentRound.roundId,
    phase,
    serverNow: nowMs,
    timeLeftMs,
    currentMultiplier: mult,
    crashMultiplier: showCrash ? round2(currentRound.crashMultiplier) : null,
    outcome: showCrash && phase !== "running" ? currentRound.outcome : null,
    bettingEndsAt: currentRound.bettingEndsAt,
    runStartedAt: currentRound.runStartedAt || null,
    runEndsAt: currentRound.runEndsAt || null,
    roundEndsAt: currentRound.roundEndsAt || null,
    crashTotalBet: currentRound.crashTotalBet || 0,
    redTotalBet: currentRound.redTotalBet || 0,
    greenTotalBet: currentRound.greenTotalBet || 0,
    moonTotalBet: currentRound.moonTotalBet || 0,
    liveUsers: [...liveUsers],
    recentResults: [...recentResults],
    payouts: { ...PAYOUT_MULT },
    timers: {
      bettingSeconds: BETTING_MS / 1000,
      resultSeconds: RESULT_MS / 1000,
    },
  };
}

export async function placeTrenballBet({ user, amount, side }) {
  if (!currentRound) throw new Error("Round is not ready");
  const phase = phaseFromRound(currentRound);
  if (phase !== "betting") throw new Error("Betting phase is closed");

  const isBot = Number(user.partnerLevel ?? 1) === 0;
  const parsedAmount = round2(Number(amount));
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0.1) {
    throw new Error("Minimum amount is 0.1");
  }
  const s = String(side || "").toLowerCase();
  if (!["crash", "red", "green", "moon"].includes(s)) {
    throw new Error("Invalid side");
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
    await TrenballHistory.create({
      _id: entryId,
      userId: String(user.userId),
      roundId: currentRound.roundId,
      userName: user.altas || "",
      avatar: user.avatar || "",
      side: s,
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
              type: "trenball",
            },
            trenballHistory: {
              _id: entryId,
              roundId: currentRound.roundId,
              userName: user.altas || "",
              avatar: user.avatar || "",
              side: s,
              betAmount: parsedAmount,
              winAmount: 0,
              createAt: betPlacedAt,
            },
            notification: buildUserNotification(
              `Bet placed $${parsedAmount.toFixed(2)} on ${currentRound.roundId} on ${s}`,
              "success",
              "Trenball",
              user.userId
            ),
          },
        }
      );
      if (up.matchedCount === 0) {
        await TrenballHistory.deleteOne({ _id: entryId });
        throw new Error("User not found");
      }
    } catch (err) {
      await TrenballHistory.deleteOne({ _id: entryId }).catch(() => {});
      throw err;
    }
    storedBetId = String(entryId);
  }

  const roundInc = {};
  if (s === "crash") roundInc.crashTotalBet = parsedAmount;
  if (s === "red") roundInc.redTotalBet = parsedAmount;
  if (s === "green") roundInc.greenTotalBet = parsedAmount;
  if (s === "moon") roundInc.moonTotalBet = parsedAmount;

  const newUserBet = {
    betId: storedBetId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    side: s,
    betAmount: parsedAmount,
    isBot,
  };

  currentRound.users = Array.isArray(currentRound.users) ? currentRound.users : [];
  currentRound.users.push(newUserBet);

  await TrenballRound.updateOne(
    { _id: currentRound._id },
    {
      ...(Object.keys(roundInc).length ? { $inc: roundInc } : {}),
      $push: { users: newUserBet },
    }
  );

  if (s === "crash") {
    currentRound.crashTotalBet = round2((currentRound.crashTotalBet || 0) + parsedAmount);
  }
  if (s === "red") {
    currentRound.redTotalBet = round2((currentRound.redTotalBet || 0) + parsedAmount);
  }
  if (s === "green") {
    currentRound.greenTotalBet = round2((currentRound.greenTotalBet || 0) + parsedAmount);
  }
  if (s === "moon") {
    currentRound.moonTotalBet = round2((currentRound.moonTotalBet || 0) + parsedAmount);
  }

  const trimmedAvatar = user.avatar == null ? "" : String(user.avatar).trim();
  const rowAvatar =
    isBot || !trimmedAvatar ? deterministicPfpPath(user.userId || user.altas) : trimmedAvatar;

  const row = {
    userName: user.altas,
    avatar: rowAvatar,
    amount: parsedAmount,
    side: s,
    userId: user.userId,
    betId: storedBetId,
    isBot,
  };
  liveUsers = [row, ...liveUsers];

  return { row, round: currentRound, betId: storedBetId, betAmount: parsedAmount };
}

export async function publishTrenballBetEvent(ably, row, round) {
  await publish(ably, EVENT_NEW_BET, {
    roundId: round.roundId,
    ...row,
    crashTotalBet: round.crashTotalBet || 0,
    redTotalBet: round.redTotalBet || 0,
    greenTotalBet: round.greenTotalBet || 0,
    moonTotalBet: round.moonTotalBet || 0,
  });
}

/** Mongoose subdocs are not plain objects — `{...doc}` drops schema paths. Always materialize for API/Redux. */
function plainTrenballEmbeddedEntry(e) {
  if (e == null) return e;
  if (typeof e.toObject === "function") return e.toObject({ virtuals: false });
  return e;
}

export async function getTrenballUserHistory(userId, limit = 50, options = {}) {
  const cap = Math.min(Math.max(1, Number(limit) || 50), 200);
  const uid = String(userId);
  let list;
  if (Array.isArray(options.embedded)) {
    list = options.embedded.map(plainTrenballEmbeddedEntry);
  } else {
    const user = await User.findOne({ userId: uid }).select("trenballHistory").lean();
    list = Array.isArray(user?.trenballHistory) ? [...user.trenballHistory] : [];
  }
  list.sort((a, b) => {
    const ta = new Date(a.createAt ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.createAt ?? b.createdAt ?? 0).getTime();
    return tb - ta;
  });
  return list.slice(0, cap).map((e) => {
    const p = plainTrenballEmbeddedEntry(e);
    return {
      ...p,
      _id: p._id,
      userId: uid,
      createdAt: p.createAt ?? p.createdAt,
    };
  });
}

export async function getTrenballLiveFeed(limit = 50) {
  const cap = Math.min(Math.max(1, Number(limit) || 50), 200);
  const rows = await TrenballHistory.find({})
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
    betAmount: e.betAmount,
    winAmount: e.winAmount,
    crashMultiplier: e.crashMultiplier,
    outcome: e.outcome,
    createdAt: e.createAt ?? e.createdAt,
  }));
}

async function maybeRunTrenballBots(ably) {
  if (!currentRound) return;
  if (phaseFromRound(currentRound) !== "betting") return;
  const cfg = trenballBotConfig || getDefaultTrenballBotConfig();
  if (!cfg.enabled) return;

  ensureTrenballRoundBotPlan(currentRound.roundId, cfg);
  const plan = trenballRoundBotPlan;
  if (!plan || plan.roundId !== currentRound.roundId) return;

  const sides = ["crash", "red", "green", "moon"];
  const maxBetsPerTick = 6;
  const maxTries = 28;
  let placedThisTick = 0;

  for (let i = 0; i < maxTries; i += 1) {
    if (placedThisTick >= maxBetsPerTick) break;
    const needSides = sides.filter((s) => plan.placed[s] < plan.target[s]);
    if (needSides.length === 0) break;
    const side = needSides[Math.floor(Math.random() * needSides.length)];

    const botUserId = sampleBotUserId();
    if (!botUserId) break;
    const botUser = await User.findOne({ userId: botUserId });
    if (!botUser) continue;

    const lo = Math.max(0.1, Number(cfg[`${side}BetMinAmount`] ?? 0.1));
    const hiCfg = Math.max(lo, Number(cfg[`${side}BetMaxAmount`] ?? 10));
    const affordableMax = Math.min(hiCfg, Number(botUser.balance ?? 0));
    if (affordableMax < lo) continue;

    const amount = randomUniformBet2(lo, affordableMax);
    if (!Number.isFinite(amount) || amount < 0.1) continue;

    try {
      const { row, round } = await placeTrenballBet({ user: botUser, amount, side });
      plan.placed[side] += 1;
      await publishTrenballBetEvent(ably, row, round);
      placedThisTick += 1;
    } catch {
      // ignore round closed / already bet / balance constraints
    }
  }
}

async function settleRound(ably) {
  if (!currentRound || settled) return;
  settled = true;
  const round = currentRound;
  const outcome = round.outcome;
  const crashMult = round.crashMultiplier;
  if (!outcome || crashMult == null) {
    console.warn("[trenball] settle skipped: missing outcome");
    return;
  }

  round.phase = "result";
  currentRound.phase = "result";
  await TrenballRound.updateOne({ _id: round._id }, { $set: { phase: "result" } });

  const multPay = PAYOUT_MULT[outcome];
  const bets = Array.isArray(round.users) ? round.users : [];

  for (const bet of bets) {
    const isWin = bet.side === outcome;
    const winAmount = isWin ? round2(bet.betAmount * multPay) : 0;
    const user = await User.findOne({ userId: bet.userId });
    if (!user || bet.isBot) continue;

    if (winAmount > 0) {
      user.balance = round2(user.balance + winAmount);
      user.totalEarn = round2((user.totalEarn || 0) + winAmount);
      user.notification.push(
        buildUserNotification(
          `Won $${winAmount.toFixed(2)} on ${round.roundId} on ${outcome} @ ${round2(crashMult)}x`,
          "success",
          "Trenball",
          user.userId
        )
      );
    }

    user.totalhistory.push({
      amount: winAmount > 0 ? winAmount : -bet.betAmount,
      date: new Date(),
      type: "trenball",
    });

    if (bet.betId && mongoose.isValidObjectId(bet.betId)) {
      const betOid = new mongoose.Types.ObjectId(bet.betId);
      await TrenballHistory.updateOne(
        { _id: betOid, userId: String(bet.userId) },
        {
          $set: {
            winAmount,
            crashMultiplier: round2(crashMult),
            outcome,
          },
        }
      );
      const dhSub = user.trenballHistory?.id?.(betOid);
      if (dhSub) {
        dhSub.winAmount = winAmount;
        dhSub.crashMultiplier = round2(crashMult);
        dhSub.outcome = outcome;
      }
    }
    await user.save();
  }

  recentResults.unshift({
    roundId: round.roundId,
    crashMultiplier: round2(crashMult),
    outcome,
  });
  recentResults = recentResults.slice(0, PREVIOUS_RESULTS_COUNT);

  await publish(ably, EVENT_RESULT, {
    roundId: round.roundId,
    crashMultiplier: round2(crashMult),
    outcome,
    phase: "result",
    crashTotalBet: round.crashTotalBet || 0,
    redTotalBet: round.redTotalBet || 0,
    greenTotalBet: round.greenTotalBet || 0,
    moonTotalBet: round.moonTotalBet || 0,
    payouts: { ...PAYOUT_MULT },
  });

  await enforceTrenballRoundRetention();
}

async function beginRunning(ably, roundIdForTimers) {
  if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
  if (currentRound.crashMultiplier != null) return;

  const crashMultiplier = sampleCrashMultiplierByBets(currentRound, trenballBotConfig) || sampleFallbackCrashMultiplier();
  const outcome = outcomeFromMultiplier(crashMultiplier);
  const runStartedAt = new Date(currentRound.bettingEndsAt);
  const dur = runDurationMs(crashMultiplier);
  const runEndsAt = new Date(runStartedAt.getTime() + dur);
  const roundEndsAt = new Date(runEndsAt.getTime() + RESULT_MS);

  currentRound.crashMultiplier = crashMultiplier;
  currentRound.outcome = outcome;
  currentRound.runStartedAt = runStartedAt;
  currentRound.runEndsAt = runEndsAt;
  currentRound.roundEndsAt = roundEndsAt;
  currentRound.phase = "running";

  await TrenballRound.updateOne(
    { _id: currentRound._id },
    {
      $set: {
        crashMultiplier,
        outcome,
        runStartedAt,
        runEndsAt,
        roundEndsAt,
        phase: "running",
      },
    }
  );

  await publish(ably, EVENT_STATE, await getTrenballStateSnapshot());

  const delaySettle = Math.max(0, runEndsAt.getTime() - Date.now());
  setTimeout(async () => {
    try {
      if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
      await settleRound(ably);
      await publish(ably, EVENT_STATE, await getTrenballStateSnapshot());
      const endMs = currentRound.roundEndsAt
        ? new Date(currentRound.roundEndsAt).getTime()
        : Date.now() + RESULT_MS;
      const delayAdvance = Math.max(0, endMs - Date.now());
      const docId = String(currentRound._id);
      setTimeout(async () => {
        await closeTrenballRoundAndAdvance(ably, roundIdForTimers, docId);
      }, delayAdvance);
    } catch (e) {
      console.error("[trenball] settle error:", e?.message || e);
    }
  }, delaySettle);
}

async function closeTrenballRoundAndAdvance(ably, roundIdForTimers, roundDocIdStr) {
  const result = advanceMutex.then(async () => {
    if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
    if (String(currentRound._id) !== roundDocIdStr) return;

    await TrenballRound.updateOne(
      { _id: currentRound._id },
      { $set: { phase: "closed" } }
    );

    currentRound = await createRound();
    settled = false;
    scheduleRoundTimers(ably, currentRound);
    await publish(ably, EVENT_STATE, await getTrenballStateSnapshot());
  });
  advanceMutex = result.catch(() => {});
  await result;
}

function scheduleRoundTimers(ably, roundForTimers) {
  if (!roundForTimers?.bettingEndsAt) return;
  const roundIdForTimers = roundForTimers.roundId;
  const delayRun = Math.max(0, new Date(roundForTimers.bettingEndsAt).getTime() - Date.now());
  setTimeout(async () => {
    try {
      await beginRunning(ably, roundIdForTimers);
    } catch (e) {
      console.error("[trenball] beginRunning error:", e?.message || e);
    }
  }, delayRun);
}

export async function startTrenballGameLoop(ably) {
  if (loopStarted) return;
  loopStarted = true;
  trenballBotConfig = getDefaultTrenballBotConfig();
  try {
    recentResults = await loadRecentResultsFromDb(PREVIOUS_RESULTS_COUNT);
  } catch {
    recentResults = [];
  }

  try {
    const cfg = await TrenballBotSettings.findOne({}).lean();
    if (cfg) trenballBotConfig = { ...trenballBotConfig, ...cfg };
  } catch {}
  try {
    botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
  } catch {
    botUserIds = [];
  }

  currentRound = await createRound();
  scheduleRoundTimers(ably, currentRound);
  await publish(ably, EVENT_STATE, await getTrenballStateSnapshot());

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
          const cfg = await TrenballBotSettings.findOne({}).lean();
          if (cfg) trenballBotConfig = { ...getDefaultTrenballBotConfig(), ...cfg };
        } catch {}
        try {
          botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
        } catch {}
      }
      await maybeRunTrenballBots(ably);
    } catch (e) {
      console.error("[trenball] bot loop error:", e?.message || e);
    } finally {
      loopInFlight = false;
    }
  }, 500);
}
