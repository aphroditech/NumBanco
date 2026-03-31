import crypto from "crypto";
import mongoose from "mongoose";
import DoubleRound from "../../models/double/DoubleRound.js";
import DoubleHistory from "../../models/double/DoubleHistory.js";
import User from "../../models/User.js";
import DoubleBotSettings, { DOUBLE_BOT_DEFAULTS } from "../../models/double/DoubleBotSettings.js";

const BETTING_MS = 10000;
const ROLLING_MS = 2000;
/** 1s result beat after the reel; then the next round opens (match `DoublePage.js`). */
const RESULT_MS = 1000;
const ROUND_MS = BETTING_MS + ROLLING_MS + RESULT_MS;

const MULT_RED_BLACK = 2;
const MULT_GREEN = 14;

// Double "previous rolls" should be persisted:
// keep exactly the last 10 settled results + 1 current betting round.
const PREVIOUS_RESULTS_COUNT = 10;

/** Matches Double UI columns (left → right: red, green, black). */
const LIVE_USER_SIDE_ORDER = { red: 0, green: 1, black: 2 };

function sortLiveUsersForSnapshot(rows) {
  return [...(rows || [])].sort((a, b) => {
    const sa = LIVE_USER_SIDE_ORDER[String(a.side || "").toLowerCase()] ?? 99;
    const sb = LIVE_USER_SIDE_ORDER[String(b.side || "").toLowerCase()] ?? 99;
    if (sa !== sb) return sa - sb;
    return (Number(b.amount) || 0) - (Number(a.amount) || 0);
  });
}

const CHANNEL_NAME = "doubleGame";
const EVENT_STATE = "DOUBLE_STATE";
const EVENT_NEW_BET = "DOUBLE_NEW_BET";
const EVENT_RESULT = "DOUBLE_RESULT";

let timer = null;
let currentRound = null;
let liveUsers = [];
let settled = false;
let settlePromise = null;
let settlingRoundId = null;
let loopInFlight = false;
let lastBroadcastPhase = null;
/** @type {{ roundId: number; slot: number; color: string }[]} */
let recentResults = [];

/** Avoid Ably message-limit bursts by throttling mid–betting state updates. */
const MID_BETTING_STATE_THROTTLE_MS = 2000;

let cachedDoubleBotSettings = null;
let lastDoubleBotSettingsFetch = 0;
/** Per-round bot placement plan (targets + counts). */
let doubleBotRoundPlan = null;

async function loadRecentResultsFromDb(limit = PREVIOUS_RESULTS_COUNT) {
  // "previous rolls" should only show settled outcomes.
  const rows = await DoubleRound.find(
    {
      phase: { $in: ["result", "closed"] },
      winningSlot: { $exists: true, $ne: null },
      winningColor: { $exists: true, $ne: null },
    },
    { _id: 0, roundId: 1, winningSlot: 1, winningColor: 1 }
  )
    .sort({ roundId: -1 })
    .limit(limit)
    .lean();

  // Newest-first order (client reverses for left-to-right rendering).
  return (rows || []).map((r) => ({
    roundId: r.roundId,
    slot: r.winningSlot,
    color: r.winningColor,
  }));
}

async function enforceDoubleRoundRetention() {
  // Keep exactly:
  // - the latest 10 settled outcomes (phase result/closed)
  // - plus at most 1 "current bet" round (phase betting/rolling)
  // Delete everything else from DoubleRound to prevent unbounded growth.
  const latestResults = await DoubleRound.find(
    {
      phase: { $in: ["result", "closed"] },
      winningSlot: { $exists: true, $ne: null },
      winningColor: { $exists: true, $ne: null },
    },
    { _id: 0, roundId: 1 }
  )
    .sort({ roundId: -1 })
    .limit(PREVIOUS_RESULTS_COUNT)
    .lean();

  const currentBet = await DoubleRound.findOne(
    { phase: { $in: ["betting", "rolling"] } },
    { _id: 0, roundId: 1 }
  )
    .sort({ roundId: -1 })
    .lean();

  const keepIds = new Set();
  for (const r of latestResults || []) keepIds.add(r.roundId);
  if (currentBet?.roundId != null) keepIds.add(currentBet.roundId);

  if (keepIds.size === 0) return;
  await DoubleRound.deleteMany({ roundId: { $nin: Array.from(keepIds) } });
}

function buildUserNotification(message, status = "success", from = "Double", to = "") {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    notification: message,
    status,
    from,
    to,
    unread: true,
  };
}

async function pushUserNotification(userId, message, status = "success") {
  if (!userId || !message) return;
  try {
    await User.updateOne(
      { userId },
      {
        $push: {
          notification: buildUserNotification(message, status, "Double", userId),
        },
      }
    );
  } catch (e) {
    console.warn("[double] pushUserNotification failed:", e?.message || e);
  }
}

function buildBetId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** Public path served by the SPA (`client/public/avatars`) — stable bot / empty-avatar display. */
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

/** 15 segments: 7 red, 7 black, 1 green — alternating R,B,… with green at center (index 7). */
const RED_SLOTS = new Set([0, 2, 4, 6, 9, 11, 13]);

export function colorForSlot(slot) {
  const s = Math.floor(Number(slot));
  if (s === 7) return "green";
  if (RED_SLOTS.has(s)) return "red";
  return "black";
}

/** One tile index per color (reel display). */
const RED_SLOT_INDICES = [0, 2, 4, 6, 9, 11, 13];
const BLACK_SLOT_INDICES = [1, 3, 5, 8, 10, 12, 14];
const GREEN_SLOT_INDEX = 7;

function randomSlotForColor(color) {
  if (color === "green") return GREEN_SLOT_INDEX;
  const list = color === "red" ? RED_SLOT_INDICES : BLACK_SLOT_INDICES;
  return list[crypto.randomInt(0, list.length)];
}

/** Contrarian red/black: heavier side loses; tie → random color. */
function contrarianRedBlackColor(redTotal, blackTotal) {
  const r = round2(Number(redTotal) || 0);
  const b = round2(Number(blackTotal) || 0);
  if (r > b) return "black";
  if (b > r) return "red";
  return crypto.randomInt(0, 2) === 0 ? "red" : "black";
}

function contrarianRedBlackOutcome(redTotal, blackTotal) {
  const winningColor = contrarianRedBlackColor(redTotal, blackTotal);
  return { winningSlot: randomSlotForColor(winningColor), winningColor };
}

/**
 * House outcome rules (uses real-user totals only; bots are excluded from totals):
 * - Contrarian red/black: redTotal > blackTotal → black wins; blackTotal > redTotal → red wins; tie → random.
 *
 * When greenTotal * 14 < redTotal + blackTotal:
 * - 50% green wins (slot 7); else same contrarian red/black as above.
 *
 * When greenTotal * 14 >= redTotal + blackTotal:
 * - Contrarian red/black only (green cannot win).
 */
function selectWinningSlotFromTotals(redTotal, greenTotal, blackTotal) {
  const r = round2(Number(redTotal) || 0);
  const g = round2(Number(greenTotal) || 0);
  const b = round2(Number(blackTotal) || 0);
  const rbSum = round2(r + b);

  if (g * MULT_GREEN < rbSum) {
    if (crypto.randomInt(0, 2) === 0) {
      return { winningSlot: GREEN_SLOT_INDEX, winningColor: "green" };
    }
    return contrarianRedBlackOutcome(r, b);
  }

  return contrarianRedBlackOutcome(r, b);
}

function payoutMultiplier(winningColor) {
  if (winningColor === "green") return MULT_GREEN;
  return MULT_RED_BLACK;
}

async function publish(ably, event, data) {
  if (!ably) return;
  const connState = ably.connection?.state;
  // When Ably is blocked/failed, skip publishing to avoid hammering and noisy errors.
  if (connState !== "connected") return;
  const channel = ably.channels.get(CHANNEL_NAME);
  try {
    await channel.publish(event, data);
  } catch (err) {
    // Intentionally swallow publish errors (e.g. auth blocked) to keep loops stable.
    if (process.env.NODE_ENV !== "test") {
      console.warn("[double] ably publish failed:", err?.code || err?.statusCode || err?.message || err);
    }
  }
}

function getPhase(elapsedMs) {
  if (elapsedMs < BETTING_MS) return "betting";
  if (elapsedMs < BETTING_MS + ROLLING_MS) return "rolling";
  if (elapsedMs < ROUND_MS) return "result";
  return "closed";
}

async function settleRound(ably) {
  if (!currentRound || settled) return;
  settled = true;

  const round = currentRound;
  settlingRoundId = round.roundId;

  settlePromise = (async () => {
    const winningColor = round.winningColor;
    const winningSlot = round.winningSlot;
    if (winningColor == null || winningSlot == null) {
      console.warn("[double] settle skipped: missing outcome");
      return;
    }

    round.phase = "result";
    await DoubleRound.updateOne({ _id: round._id }, { $set: { phase: "result" } });

    const mult = payoutMultiplier(winningColor);
    const bets = Array.isArray(round.users) ? round.users : [];

    for (const bet of bets) {
      const isWin = bet.side === winningColor;
      const winAmount = isWin ? round2(bet.betAmount * mult) : 0;

      const user = await User.findOne({ userId: bet.userId });
      if (!user) continue;
      if (bet.isBot) continue;

      if (winAmount > 0) {
        user.balance = round2(user.balance + winAmount);
        user.totalEarn = round2((user.totalEarn || 0) + winAmount);
        user.notification.push(
          buildUserNotification(
            `You won $${Number(winAmount).toFixed(2)} on Double round ${round.roundId} (${winningColor})`,
            "success",
            "Double",
            user.userId
          )
        );
      }

      const profit = winAmount > 0 ? winAmount - bet.betAmount : -bet.betAmount;
      user.totalhistory.push({
        amount: winAmount > 0 ? winAmount : -bet.betAmount,
        date: new Date(),
        type: "double",
      });

      if (bet.betId && mongoose.isValidObjectId(bet.betId)) {
        const betOid = new mongoose.Types.ObjectId(bet.betId);
        await DoubleHistory.updateOne(
          { _id: betOid, userId: String(bet.userId) },
          {
            $set: {
              winAmount,
              winningColor,
              winningSlot,
            },
          }
        );
        const dhSub = user.doubleHistory?.id?.(betOid);
        if (dhSub) {
          dhSub.winAmount = winAmount;
          dhSub.winningColor = winningColor;
          dhSub.winningSlot = winningSlot;
        }
      }
      await user.save();
    }

    recentResults.unshift({
      roundId: round.roundId,
      slot: winningSlot,
      color: winningColor,
    });
    recentResults = recentResults.slice(0, PREVIOUS_RESULTS_COUNT);

    await publish(ably, EVENT_RESULT, {
      roundId: round.roundId,
      winningSlot,
      winningColor,
      phase: "result",
      redTotalBet: round.redTotalBet || 0,
      blackTotalBet: round.blackTotalBet || 0,
      greenTotalBet: round.greenTotalBet || 0,
      multipliers: { red: MULT_RED_BLACK, black: MULT_RED_BLACK, green: MULT_GREEN },
    });

    // Trim DoubleRound collection to the configured retention window.
    await enforceDoubleRoundRetention();
  })();

  try {
    await settlePromise;
  } finally {
    settlePromise = null;
    settlingRoundId = null;
  }
}

async function beginRolling(ably, roundIdForTimers) {
  if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
  if (currentRound.winningSlot != null) return;

  const { winningSlot, winningColor } = selectWinningSlotFromTotals(
    currentRound.redTotalBet,
    currentRound.greenTotalBet,
    currentRound.blackTotalBet
  );

  currentRound.winningSlot = winningSlot;
  currentRound.winningColor = winningColor;
  currentRound.phase = "rolling";

  lastBroadcastPhase = "rolling";
  const snapshot = await getDoubleStateSnapshot();
  await Promise.all([
    DoubleRound.updateOne(
      { _id: currentRound._id },
      { $set: { winningSlot, winningColor, phase: "rolling" } }
    ),
    publish(ably, EVENT_STATE, snapshot),
  ]);
}

async function createRound() {
  const latest = await DoubleRound.findOne({}).sort({ roundId: -1 });
  const roundId = latest?.roundId ? latest.roundId + 1 : 1;
  const now = new Date();
  const endAt = new Date(now.getTime() + ROUND_MS);

  const round = await DoubleRound.create({
    roundId,
    phase: "betting",
    startAt: now,
    endAt,
    users: [],
  });

  // Asynchronously enforce retention to avoid blocking new round creation.
  // This can run in the background.
  enforceDoubleRoundRetention().catch((err) => {
    console.warn("[double] retention cleanup failed:", err?.message || err);
  });

  liveUsers = [];
  settled = false;
  return round;
}

export async function getDoubleStateSnapshot() {
  if (!currentRound) return null;
  const elapsedMs = Math.max(0, Date.now() - new Date(currentRound.startAt).getTime());
  const phase = getPhase(elapsedMs);

  let timeLeftMs = 0;
  if (phase === "betting") timeLeftMs = BETTING_MS - elapsedMs;
  else if (phase === "rolling") timeLeftMs = BETTING_MS + ROLLING_MS - elapsedMs;
  else if (phase === "result") timeLeftMs = ROUND_MS - elapsedMs;

  const showOutcome = phase === "rolling" || phase === "result" || phase === "closed";

  return {
    roundId: currentRound.roundId,
    phase,
    timeLeftMs: Math.max(0, timeLeftMs),
    roundStartAtMs: currentRound.startAt?.getTime?.() ?? Date.now(),
    serverNow: Date.now(),
    winningSlot: showOutcome ? currentRound.winningSlot : null,
    winningColor: showOutcome ? currentRound.winningColor : null,
    redTotalBet: currentRound.redTotalBet || 0,
    blackTotalBet: currentRound.blackTotalBet || 0,
    greenTotalBet: currentRound.greenTotalBet || 0,
    liveUsers: sortLiveUsersForSnapshot(liveUsers),
    recentResults: [...recentResults],
    multipliers: { red: MULT_RED_BLACK, black: MULT_RED_BLACK, green: MULT_GREEN },
    timers: {
      bettingSeconds: BETTING_MS / 1000,
      rollingSeconds: ROLLING_MS / 1000,
      resultSeconds: RESULT_MS / 1000,
      totalSeconds: ROUND_MS / 1000,
    },
  };
}

export async function placeDoubleBet({ user, amount, side }) {
  if (!currentRound) throw new Error("Round is not ready");

  const elapsedMs = Math.max(0, Date.now() - new Date(currentRound.startAt).getTime());
  if (getPhase(elapsedMs) !== "betting") {
    throw new Error("Betting phase is closed");
  }

  /** partnerLevel 0 = synthetic bot users; schema default is 1 for real players — missing field must not skip DoubleHistory insert. */
  const isBot = Number(user.partnerLevel ?? 1) === 0;

  const parsedAmount = round2(Number(amount));
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0.1) {
    throw new Error("Minimum amount is 0.1");
  }
  if (parsedAmount > 50) {
    throw new Error("Maximum amount is $50");
  }
  if (!["red", "black", "green"].includes(side)) {
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
    await DoubleHistory.create({
      _id: entryId,
      userId: String(user.userId),
      roundId: currentRound.roundId,
      userName: user.altas || "",
      avatar: user.avatar || "",
      side,
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
          },
          $push: {
            totalhistory: {
              amount: -parsedAmount,
              date: new Date(),
              type: "double",
            },
            doubleHistory: {
              _id: entryId,
              roundId: currentRound.roundId,
              userName: user.altas || "",
              avatar: user.avatar || "",
              side,
              betAmount: parsedAmount,
              winAmount: 0,
              createAt: betPlacedAt,
            },
            notification: buildUserNotification(
              `You bet $${parsedAmount.toFixed(2)} on ${side} in Double round ${currentRound.roundId}`,
              "success",
              "Double",
              user.userId
            ),
          },
        }
      );
      if (up.matchedCount === 0) {
        await DoubleHistory.deleteOne({ _id: entryId });
        throw new Error("User not found");
      }
    } catch (err) {
      await DoubleHistory.deleteOne({ _id: entryId }).catch(() => {});
      throw err;
    }
    storedBetId = String(entryId);
  }

  const roundInc = {};
  if (!isBot && side === "red") roundInc.redTotalBet = parsedAmount;
  if (!isBot && side === "black") roundInc.blackTotalBet = parsedAmount;
  if (!isBot && side === "green") roundInc.greenTotalBet = parsedAmount;
  const newUserBet = {
    betId: storedBetId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    side,
    betAmount: parsedAmount,
    isBot,
  };

  currentRound.users = Array.isArray(currentRound.users) ? currentRound.users : [];
  currentRound.users.push(newUserBet);

  await DoubleRound.updateOne(
    { _id: currentRound._id },
    {
      ...(Object.keys(roundInc).length ? { $inc: roundInc } : {}),
      $push: { users: newUserBet },
    }
  );

  if (!isBot && side === "red") {
    currentRound.redTotalBet = round2((currentRound.redTotalBet || 0) + parsedAmount);
  }
  if (!isBot && side === "black") {
    currentRound.blackTotalBet = round2((currentRound.blackTotalBet || 0) + parsedAmount);
  }
  if (!isBot && side === "green") {
    currentRound.greenTotalBet = round2((currentRound.greenTotalBet || 0) + parsedAmount);
  }

  const trimmedAvatar = user.avatar == null ? "" : String(user.avatar).trim();
  const rowAvatar =
    isBot || !trimmedAvatar
      ? deterministicPfpPath(user.userId || user.altas)
      : trimmedAvatar;

  const row = {
    userName: user.altas,
    avatar: rowAvatar,
    amount: parsedAmount,
    side,
    userId: user.userId,
    betId: storedBetId,
    isBot,
  };
  liveUsers = [row, ...liveUsers];

  return { row, round: currentRound, betId: storedBetId, betAmount: parsedAmount };
}

export async function getDoubleUserHistory(userId, limit = 50, options = {}) {
  const cap = Math.min(Math.max(1, Number(limit) || 50), 200);
  const uid = String(userId);
  let list;
  if (Array.isArray(options.embedded)) {
    list = [...options.embedded];
  } else {
    const user = await User.findOne({ userId: uid }).select("doubleHistory").lean();
    list = Array.isArray(user?.doubleHistory) ? [...user.doubleHistory] : [];
  }
  list.sort((a, b) => {
    const ta = new Date(a.createAt ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.createAt ?? b.createdAt ?? 0).getTime();
    return tb - ta;
  });
  return list.slice(0, cap).map((e) => ({
    ...e,
    _id: e._id,
    userId: uid,
    createdAt: e.createAt ?? e.createdAt,
  }));
}

export async function getDoubleRoundHistory(limit = 40) {
  const cap = Math.min(Math.max(1, Number(limit) || 40), 200);
  const rows = await DoubleHistory.find({})
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
    winningColor: e.winningColor,
    winningSlot: e.winningSlot,
    createdAt: e.createAt ?? e.createdAt,
  }));
}

export async function publishDoubleBetEvent(ably, row, round) {
  await publish(ably, EVENT_NEW_BET, {
    roundId: round.roundId,
    ...row,
    redTotalBet: round.redTotalBet || 0,
    blackTotalBet: round.blackTotalBet || 0,
    greenTotalBet: round.greenTotalBet || 0,
  });
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clampIntPair(lo, hi) {
  const a = Math.floor(Number(lo));
  const b = Math.floor(Number(hi));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [0, 0];
  return a <= b ? [a, b] : [b, a];
}

/** Inclusive random integer in [lo, hi]. */
function randomIntInclusive(lo, hi) {
  const [a, b] = clampIntPair(lo, hi);
  if (b < a || a < 0) return 0;
  return crypto.randomInt(a, b + 1);
}

function ensureDoubleBotRoundPlan(roundId, s) {
  if (!s || s.enabled === false) {
    doubleBotRoundPlan = null;
    return null;
  }
  if (doubleBotRoundPlan?.roundId === roundId) return doubleBotRoundPlan;
  doubleBotRoundPlan = {
    roundId,
    redT: randomIntInclusive(s.redMinShows, s.redMaxShows),
    greenT: randomIntInclusive(s.greenMinShows, s.greenMaxShows),
    blackT: randomIntInclusive(s.blackMinShows, s.blackMaxShows),
    redC: 0,
    greenC: 0,
    blackC: 0,
  };
  return doubleBotRoundPlan;
}

function normalizeDoubleBotSettings(doc) {
  return { ...DOUBLE_BOT_DEFAULTS, ...(doc && typeof doc === "object" ? doc : {}) };
}

async function ensureDoubleBotSettingsRow() {
  const doc = await DoubleBotSettings.findOneAndUpdate(
    { label: "default" },
    { $setOnInsert: DOUBLE_BOT_DEFAULTS },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return normalizeDoubleBotSettings(doc);
}

/**
 * Place one bot bet on `side` with amount in [minBetRaw, maxBetRaw] (clamped to game rules + balance).
 * Tries several distinct bot users — each user may only bet once per round.
 */
async function tryPlaceOneDoubleBot(ably, botUserIds, side, minBetRaw, maxBetRaw) {
  if (!Array.isArray(botUserIds) || botUserIds.length === 0) return false;

  let minBet = round2(Math.max(0.1, Number(minBetRaw) || 0.1));
  let maxBet = round2(Number(maxBetRaw) ?? minBet);
  if (!Number.isFinite(maxBet)) maxBet = minBet;
  if (maxBet < minBet) {
    const t = minBet;
    minBet = maxBet;
    maxBet = t;
  }
  maxBet = Math.min(50, maxBet);

  const order = [...botUserIds].sort(() => Math.random() - 0.5);
  const tryLimit = Math.min(order.length, 24);

  for (let i = 0; i < tryLimit; i += 1) {
    const botUserId = order[i]?.userId ?? order[i];
    if (!botUserId) continue;
    const botUser = await User.findOne({ userId: botUserId });
    if (!botUser) continue;

    // Bots are synthetic live-feed rows; don't depend on stored balance.
    const betAmount = round2(randomBetween(minBet, maxBet));
    if (!Number.isFinite(betAmount) || betAmount < 0.1) continue;

    try {
      const { row, round } = await placeDoubleBet({ user: botUser, amount: betAmount, side });
      await publishDoubleBetEvent(ably, row, round);
      return true;
    } catch {
      // already bet this round / phase closed / insufficient balance
    }
  }
  return false;
}

export async function startDoubleGameLoop(ably) {
  if (timer) return;
  currentRound = await createRound();
  lastBroadcastPhase = null;
  try {
    // Hydrate "previous rolls" from DB so it persists across server restarts.
    recentResults = await loadRecentResultsFromDb(PREVIOUS_RESULTS_COUNT);
  } catch {
    recentResults = [];
  }

  try {
    cachedDoubleBotSettings = await ensureDoubleBotSettingsRow();
    lastDoubleBotSettingsFetch = Date.now();
  } catch (e) {
    console.warn("[double] bot settings init failed:", e?.message || e);
    cachedDoubleBotSettings = normalizeDoubleBotSettings(null);
    lastDoubleBotSettingsFetch = Date.now();
  }

  /** Close the given round (if still current) and start the next; shared by interval fallback + scheduled timeout. */
  let closeDoubleRoundAndAdvance;
  /** Serialize rollovers: timeout + interval can fire together and would otherwise double-insert roundId. */
  let doubleAdvanceMutex = Promise.resolve();

  const scheduleRoundTimers = (roundForTimers) => {
    if (!roundForTimers?.startAt) return;
    const roundIdForTimers = roundForTimers.roundId;
    const startAtMs = roundForTimers.startAt.getTime();
    const roundDocIdStr = String(roundForTimers._id);

    const delayRolling = Math.max(0, startAtMs + BETTING_MS - Date.now());
    setTimeout(async () => {
      await beginRolling(ably, roundIdForTimers);
    }, delayRolling);

    // Reel end: settle → broadcast result state → wait RESULT_MS → next round (one chain; no orphaned timers).
    const delaySettle = Math.max(0, startAtMs + BETTING_MS + ROLLING_MS - Date.now());
    setTimeout(async () => {
      try {
        if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
        lastBroadcastPhase = "result";
        await settleRound(ably);
        await publish(ably, EVENT_STATE, await getDoubleStateSnapshot());
        // if (RESULT_MS > 0) {
        //   await new Promise((r) => setTimeout(r, RESULT_MS));
        // }
        await closeDoubleRoundAndAdvance(roundIdForTimers, roundDocIdStr);
      } catch (e) {
        console.error("[double] settle/advance error:", e?.message || e);
      }
    }, delaySettle);
  };

  closeDoubleRoundAndAdvance = (roundIdForTimers, roundDocIdStr) => {
    const result = doubleAdvanceMutex.then(async () => {
      if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
      if (settlePromise && settlingRoundId === roundIdForTimers) {
        await settlePromise;
      }
      if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
      if (String(currentRound._id) !== roundDocIdStr) return;
      await DoubleRound.updateOne({ _id: currentRound._id }, { $set: { phase: "betting" } });
      currentRound = await createRound();
      settled = false;
      scheduleRoundTimers(currentRound);
      lastBroadcastPhase = "betting";
      await publish(ably, EVENT_STATE, await getDoubleStateSnapshot());
    });
    doubleAdvanceMutex = result.catch(() => {});
    return result;
  };

  scheduleRoundTimers(currentRound);

  let botUserIds = [];
  try {
    botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
  } catch {}
  let lastBotUserRefreshAt = 0;
  // Throttle Ably state snapshots to avoid hitting Ably message limits.
  // Betting phase currently runs frequently; without throttling it can publish every tick.
  let lastStateBroadcastAt = 0;
  const STATE_BROADCAST_MIN_GAP_MS = 2500;

  timer = setInterval(async () => {
    if (loopInFlight) return;
    loopInFlight = true;
    try {
      if (!currentRound) return;
      const roundAtTick = currentRound;
      const elapsedMs = Math.max(0, Date.now() - new Date(roundAtTick.startAt).getTime());

      /** setTimeout can lag on a busy loop; start the roll as soon as the betting window is over. */
      if (elapsedMs >= BETTING_MS && roundAtTick.winningSlot == null) {
        await beginRolling(ably, roundAtTick.roundId);
      }

      const phase = getPhase(elapsedMs);
      const nextPhase = phase === "closed" ? "result" : phase;

      const phaseChanged = nextPhase !== lastBroadcastPhase;
      if (phaseChanged) {
        lastBroadcastPhase = nextPhase;
        await publish(ably, EVENT_STATE, await getDoubleStateSnapshot());
      }

      if (phase === "betting") {
        const refreshMs = Math.max(2000, Number(cachedDoubleBotSettings.settingsRefreshMs) || 5000);
        if (Date.now() - lastDoubleBotSettingsFetch >= refreshMs) {
          lastDoubleBotSettingsFetch = Date.now();
          try {
            const raw = await DoubleBotSettings.findOne({ label: "default" }).lean();
            cachedDoubleBotSettings = normalizeDoubleBotSettings(raw || DOUBLE_BOT_DEFAULTS);
          } catch (e) {
            console.warn("[double] bot settings reload failed:", e?.message || e);
          }
        }

        if (Date.now() - lastBotUserRefreshAt > 12000) {
          lastBotUserRefreshAt = Date.now();
          try {
            botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
          } catch {}
        }

        const plan = ensureDoubleBotRoundPlan(currentRound.roundId, cachedDoubleBotSettings);
        if (cachedDoubleBotSettings?.enabled && plan && botUserIds.length > 0) {
          const s = cachedDoubleBotSettings;
          /** Same order as UI columns; round-robin so all sides fill together (not one side to target first). */
          const SIDE_PLACE_ORDER = ["red", "green", "black"];
          const MAX_BOTS_PER_TICK = 8;
          let placedThisTick = 0;

          while (placedThisTick < MAX_BOTS_PER_TICK) {
            let anyPlaced = false;
            for (const side of SIDE_PLACE_ORDER) {
              if (placedThisTick >= MAX_BOTS_PER_TICK) break;
              const tKey = `${side}T`;
              const cKey = `${side}C`;
              const minA = s[`${side}MinAmount`];
              const maxA = s[`${side}MaxAmount`];
              if (plan[cKey] >= plan[tKey]) continue;
              const ok = await tryPlaceOneDoubleBot(ably, botUserIds, side, minA, maxA);
              if (!ok) continue;
              plan[cKey] += 1;
              placedThisTick += 1;
              anyPlaced = true;
            }
            if (!anyPlaced) break;
          }
        }
      }

      if (elapsedMs >= BETTING_MS + ROLLING_MS && !settled) {
        await settleRound(ably);
      }

      if (elapsedMs >= ROUND_MS) {
        await closeDoubleRoundAndAdvance(roundAtTick.roundId, String(roundAtTick._id));
      }
    } catch (err) {
      console.error("[double] loop error:", err);
    } finally {
      loopInFlight = false;
    }
  }, 500);
}
