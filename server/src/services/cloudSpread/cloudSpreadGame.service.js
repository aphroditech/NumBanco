import CloudSpreadRound from "../../models/CloudSpreadRound.js";
import CloudSpreadHistory from "../../models/CloudSpreadHistory.js";
import User from "../../models/User.js";

const TOTAL_STEPS = 8;
const CLOUDS_PER_STEP = 10;
const MIN_CLOUDS = CLOUDS_PER_STEP;
const MAX_CLOUDS = TOTAL_STEPS * CLOUDS_PER_STEP;
const ROUND_TIMEOUT_MS = 45000;
const RESULT_MS = 3000;

/** Per-user session (like Rubic / Pumping). */
const sessions = new Map();
let timer = null;

/** Ably live feed (right column) — set from `server.js` when Ably connects. */
const CLOUD_SPREAD_LIVE_CHANNEL = "cloudSpreadLive";
const CLOUD_SPREAD_LIVE_EVENT = "CLOUD_SPREAD_HISTORY";
let cloudSpreadAbly = null;

export function setCloudSpreadAbly(ably) {
  cloudSpreadAbly = ably;
}

function serializeCloudSpreadHistoryDoc(doc) {
  const o = doc?.toObject ? doc.toObject({ virtuals: true }) : doc;
  if (!o) return null;
  const createdAt = o.createdAt;
  return {
    _id: o._id != null ? String(o._id) : undefined,
    userId: o.userId,
    userName: o.userName,
    avatar: o.avatar || "",
    targetStep: o.targetStep,
    targetMultiplier: o.targetMultiplier,
    betAmount: o.betAmount,
    sessionStake: o.sessionStake,
    winAmount: o.winAmount,
    isBot: !!o.isBot,
    isCashOutSummary: !!o.isCashOutSummary,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
  };
}

/** Push one row to all clients (cash-out summaries + bot plays). */
export async function publishCloudSpreadLiveRow(doc) {
  if (!cloudSpreadAbly || !doc) return;
  try {
    const payload = serializeCloudSpreadHistoryDoc(doc);
    if (!payload) return;
    const channel = cloudSpreadAbly.channels.get(CLOUD_SPREAD_LIVE_CHANNEL);
    await channel.publish(CLOUD_SPREAD_LIVE_EVENT, payload);
  } catch (err) {
    console.warn("[cloudSpread] Ably publish live row failed:", err?.message || err);
  }
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function buildBetId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function multiplierForStep(step) {
  return 2 ** Number(step);
}

function buildCloudMultipliers(cloudCount) {
  const count = Math.max(0, Number(cloudCount || 0));
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const cloudIndex = i + 1;
    const stepBand = Math.min(TOTAL_STEPS, Math.ceil(cloudIndex / CLOUDS_PER_STEP));
    const max = multiplierForStep(stepBand);
    list.push(round2(Math.random() * max));
  }
  return list;
}

function extendCloudMultipliers(prevList, newCount) {
  const count = Math.max(0, Number(newCount || 0));
  const prev = Array.isArray(prevList) ? prevList : [];
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const existing = prev[i];
    if (i < prev.length && Number.isFinite(Number(existing))) {
      list.push(round2(Number(existing)));
      continue;
    }
    const cloudIndex = i + 1;
    const stepBand = Math.min(TOTAL_STEPS, Math.ceil(cloudIndex / CLOUDS_PER_STEP));
    const max = multiplierForStep(stepBand);
    list.push(round2(Math.random() * max));
  }
  return list;
}

function getCurrentStepFromClouds(clouds) {
  if (!clouds || clouds <= 0) return 0;
  return Math.min(TOTAL_STEPS, Math.ceil(clouds / CLOUDS_PER_STEP));
}

function pickCrashStep() {
  const pool = [1, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8];
  return pool[Math.floor(Math.random() * pool.length)];
}

function productCloudMultipliers(bets) {
  let p = 1;
  for (const b of bets) {
    const m = Number(b.selectedCloudMultiplier);
    p *= Number.isFinite(m) && m > 0 ? m : 1;
  }
  return p;
}

function getSession(userId) {
  const id = String(userId);
  let s = sessions.get(id);
  if (!s) {
    s = {
      currentRound: null,
      settled: false,
      settledAtMs: 0,
      currentClouds: MIN_CLOUDS,
      selectedCloudTrail: [],
      currentCloudMultipliers: [],
    };
    sessions.set(id, s);
  }
  return s;
}

function persistSessionToRound(s) {
  if (!s?.currentRound) return;
  s.currentRound.sessionClouds = s.currentClouds;
  s.currentRound.sessionTrail = Array.isArray(s.selectedCloudTrail) ? [...s.selectedCloudTrail] : [];
  s.currentRound.sessionMultipliers = Array.isArray(s.currentCloudMultipliers)
    ? [...s.currentCloudMultipliers]
    : [];
}

function syncSessionFromRoundDoc(s) {
  if (!s?.currentRound) return;
  const r = s.currentRound;
  s.currentClouds = Number(r.sessionClouds) >= MIN_CLOUDS ? r.sessionClouds : MIN_CLOUDS;
  s.selectedCloudTrail = Array.isArray(r.sessionTrail) ? [...r.sessionTrail] : [];
  const mults = Array.isArray(r.sessionMultipliers)
    ? r.sessionMultipliers.map((x) => round2(Number(x)))
    : [];
  if (mults.length >= s.currentClouds) {
    s.currentCloudMultipliers = mults.slice(0, s.currentClouds);
  } else {
    s.currentCloudMultipliers = extendCloudMultipliers(mults, s.currentClouds);
  }
}

async function hydrateSessionFromLatestRound(userId, s) {
  const uid = String(userId);
  const latest = await CloudSpreadRound.findOne({ userId: uid }).sort({ roundId: -1 });
  if (!latest) return;

  if (latest.phase === "betting") {
    s.currentRound = latest;
    s.settled = false;
    s.settledAtMs = 0;
    const n = (latest.users || []).length;
    const derivedClouds = Math.min(MAX_CLOUDS, MIN_CLOUDS + n * CLOUDS_PER_STEP);
    if (Number(latest.sessionClouds) >= MIN_CLOUDS) {
      syncSessionFromRoundDoc(s);
    } else {
      s.currentClouds = derivedClouds;
      s.selectedCloudTrail = [];
      s.currentCloudMultipliers = extendCloudMultipliers([], s.currentClouds);
    }
    persistSessionToRound(s);
    await s.currentRound.save();
    return;
  }

  if (latest.phase === "result") {
    s.currentRound = latest;
    s.settled = true;
    const at = latest.resultSettledAt?.getTime?.();
    s.settledAtMs = at && at > 0 ? at : Date.now();
    if (Number(latest.sessionClouds) >= MIN_CLOUDS) {
      syncSessionFromRoundDoc(s);
    } else {
      s.currentClouds = Math.max(MIN_CLOUDS, Number(latest.finalClouds || MIN_CLOUDS));
      s.selectedCloudTrail = [];
      s.currentCloudMultipliers = buildCloudMultipliers(s.currentClouds);
    }
    persistSessionToRound(s);
    await s.currentRound.save();
  }
}

async function createRound(userId) {
  const uid = String(userId);
  const latest = await CloudSpreadRound.findOne({ userId: uid }).sort({ roundId: -1 });
  const roundId = latest?.roundId ? latest.roundId + 1 : 1;
  const now = new Date();
  const sessionMultipliers = buildCloudMultipliers(MIN_CLOUDS);
  return CloudSpreadRound.create({
    userId: uid,
    roundId,
    phase: "betting",
    startAt: now,
    runStartAt: now,
    endAt: new Date(now.getTime() + ROUND_TIMEOUT_MS + RESULT_MS),
    crashStep: pickCrashStep(),
    finalStep: 0,
    finalClouds: 0,
    users: [],
    totalBet: 0,
    sessionStake: 0,
    sessionClouds: MIN_CLOUDS,
    sessionTrail: [],
    sessionMultipliers,
    resultSettledAt: null,
  });
}

async function maybeAdvanceResultPhase(userId) {
  const s = getSession(userId);
  if (!s.currentRound || s.currentRound.phase !== "result") return;
  const t =
    s.settledAtMs > 0
      ? s.settledAtMs
      : s.currentRound.resultSettledAt?.getTime?.() ?? 0;
  if (!t) return;
  if (Date.now() - t < RESULT_MS) return;
  await advanceToNextBettingRound(userId);
}

/** After cash-out / bust, start a fresh round immediately (no waiting on RESULT_MS). */
async function advanceToNextBettingRound(userId) {
  const s = getSession(userId);
  s.currentRound = await createRound(userId);
  s.settled = false;
  s.settledAtMs = 0;
  syncSessionFromRoundDoc(s);
  persistSessionToRound(s);
  await s.currentRound.save();
}

async function ensureActiveRound(userId) {
  const s = getSession(userId);
  if (!s.currentRound) {
    await hydrateSessionFromLatestRound(userId, s);
  }
  await maybeAdvanceResultPhase(userId);
  if (!s.currentRound) {
    s.currentRound = await createRound(userId);
    s.settled = false;
    s.settledAtMs = 0;
    syncSessionFromRoundDoc(s);
    persistSessionToRound(s);
    await s.currentRound.save();
  }
  return s;
}

function countUserBetsInRound(userId) {
  const s = getSession(userId);
  if (!s.currentRound) return 0;
  return (s.currentRound.users || []).filter((u) => String(u.userId) === String(userId)).length;
}

async function ensureCloudSpreadHistoryIndexes() {
  try {
    const indexNameToDrop = "roundId_1_userId_1";
    const indexes = await CloudSpreadHistory.collection.indexes();
    const hasOldIndex = indexes.some((ix) => ix?.name === indexNameToDrop);

    if (hasOldIndex) {
      console.log(`[cloudSpread] Dropping stale CloudSpreadHistory unique index: ${indexNameToDrop}`);
      await CloudSpreadHistory.collection.dropIndex(indexNameToDrop);
    }

    await CloudSpreadHistory.syncIndexes();
  } catch (err) {
    console.warn("[cloudSpread] ensureCloudSpreadHistoryIndexes failed:", err?.message || err);
  }
}

/** Per-user rounds: drop legacy unique index on `roundId` alone if present. */
async function ensureCloudSpreadRoundIndexes() {
  try {
    const indexes = await CloudSpreadRound.collection.indexes();
    const stale = indexes.find((ix) => ix?.name === "roundId_1" && ix.unique);
    if (stale) {
      console.log("[cloudSpread] Dropping legacy CloudSpreadRound unique index: roundId_1");
      await CloudSpreadRound.collection.dropIndex("roundId_1");
    }
    await CloudSpreadRound.syncIndexes();
  } catch (err) {
    console.warn("[cloudSpread] ensureCloudSpreadRoundIndexes failed:", err?.message || err);
  }
}

async function settleRound(userId) {
  const s = getSession(userId);
  if (!s.currentRound || s.settled) return;
  s.settled = true;
  s.settledAtMs = Date.now();

  const bets = Array.isArray(s.currentRound.users) ? s.currentRound.users : [];
  const finalClouds = s.currentClouds;

  s.currentRound.phase = "result";
  s.currentRound.finalStep = Number(s.currentRound.crashStep || 1);
  s.currentRound.finalClouds = finalClouds;
  s.currentRound.resultSettledAt = new Date(s.settledAtMs);
  persistSessionToRound(s);
  await s.currentRound.save();

  const byUser = new Map();
  for (const bet of bets) {
    if (bet.isBot) continue;
    const uid = String(bet.userId);
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(bet);
  }

  for (const [uid, userBets] of byUser) {
    const user = await User.findOne({ userId: uid });
    if (!user) continue;

    const totalStake = userBets.reduce((st, b) => st + Number(b.betAmount || 0), 0);
    const multProduct = productCloudMultipliers(userBets);
    const totalWin = round2(totalStake * multProduct);

    if (!Array.isArray(user.cloudSpreadHistory)) user.cloudSpreadHistory = [];
    const roundStakeForHistory = round2(
      Number(s.currentRound.sessionStake || 0) || totalStake
    );

    user.cloudSpreadHistory.push({
      roundId: s.currentRound.roundId,
      totalBet: roundStakeForHistory,
      win: totalWin,
      crashStep: Number(s.currentRound.crashStep || 1),
      finalClouds: finalClouds,
      multProduct: round2(multProduct),
      createAt: new Date(),
    });

    if (totalWin > 0) {
      user.balance = round2(user.balance + totalWin);
      user.totalEarn = round2((user.totalEarn || 0) + totalWin);
      user.totalhistory.push({
        amount: totalWin,
        date: new Date(),
        type: "cloudSpread",
      });
    }

    /** Persist round to CloudSpreadHistory on cash-out / settle (single summary row per round). */
    const historyDoc = await CloudSpreadHistory.create({
      roundId: s.currentRound.roundId,
      userId: user.userId,
      userName: user.altas,
      avatar: user.avatar || "",
      targetStep: Math.min(TOTAL_STEPS, Math.max(1, userBets.length)),
      targetMultiplier: round2(multProduct),
      betAmount: roundStakeForHistory,
      sessionStake: roundStakeForHistory,
      winAmount: totalWin,
      isBot: false,
      isCashOutSummary: true,
    });
    await publishCloudSpreadLiveRow(historyDoc);

    await user.save();
  }
}

export async function getCloudSpreadStateSnapshot(forUserId = null) {
  if (!forUserId) return null;
  await ensureActiveRound(forUserId);
  const s = getSession(forUserId);
  if (!s.currentRound) return null;

  const phase = s.currentRound.phase || "betting";
  const currentStep = getCurrentStepFromClouds(Math.max(MIN_CLOUDS, s.currentClouds));
  const clouds = Math.max(MIN_CLOUDS, s.currentClouds);
  const maxMultiplier = currentStep > 0 ? multiplierForStep(currentStep) : 1;
  const resultStart =
    s.settledAtMs > 0
      ? s.settledAtMs
      : s.currentRound.resultSettledAt?.getTime?.() ?? 0;
  const resultElapsedMs =
    phase === "result" && resultStart > 0 ? Math.max(0, Date.now() - resultStart) : 0;
  const timeLeftMs = phase === "result" ? Math.max(0, RESULT_MS - resultElapsedMs) : null;

  const snapshot = {
    roundId: s.currentRound.roundId,
    phase,
    timeLeftMs,
    roundStartAtMs: s.currentRound.startAt?.getTime?.() ?? Date.now(),
    totalSteps: TOTAL_STEPS,
    maxBetsPerRound: TOTAL_STEPS,
    cloudsPerStep: CLOUDS_PER_STEP,
    currentStep,
    currentClouds: clouds,
    maxMultiplier,
    cloudMultipliers: s.currentCloudMultipliers,
    crashStep: phase === "result" ? Number(s.currentRound.crashStep || 1) : null,
    liveUsers: [],
    selectedClouds: s.selectedCloudTrail,
    totalBet: Number(s.currentRound.totalBet || 0),
    timers: {
      bettingSeconds: null,
      stepSeconds: 0,
      resultSeconds: RESULT_MS / 1000,
      totalSeconds: null,
    },
  };

  const mine = (s.currentRound.users || []).filter((u) => String(u.userId) === String(forUserId));
  snapshot.myBetCount = mine.length;
  let summedStake = 0;
  let myMultProduct = 1;
  for (const b of mine) {
    summedStake += Number(b.betAmount || 0);
    const m = Number(b.selectedCloudMultiplier);
    myMultProduct *= Number.isFinite(m) && m > 0 ? m : 1;
  }
  summedStake = round2(summedStake);
  myMultProduct = round2(myMultProduct);
  const lockedStake = round2(Number(s.currentRound.sessionStake || 0));
  const effectiveStake = lockedStake > 0 ? lockedStake : summedStake;
  snapshot.sessionStake = lockedStake;
  snapshot.myTotalStake = effectiveStake;
  snapshot.myCloudMultProduct = myMultProduct;
  snapshot.cashOutPayoutPreview =
    phase === "betting" && mine.length > 0 ? round2(effectiveStake * myMultProduct) : 0;

  return snapshot;
}

export async function placeCloudSpreadBet({ user, amount, targetStep }) {
  const uid = user.userId;
  await ensureActiveRound(uid);
  const s = getSession(uid);

  if (!s.currentRound) throw new Error("Round is not ready");
  if (s.currentRound.phase !== "betting") throw new Error("Betting phase is closed");

  const betsSoFar = countUserBetsInRound(uid);
  if (betsSoFar >= TOTAL_STEPS) {
    throw new Error(`Maximum ${TOTAL_STEPS} bets per round`);
  }

  /** First play: pay stake once. Later steps: free (same round until cash-out). */
  let entryStake = 0;
  if (betsSoFar === 0) {
    const paid = round2(Number(amount));
    if (!Number.isFinite(paid) || paid < 0.1) throw new Error("Minimum amount is 0.1");
    if (user.balance < paid) throw new Error("Insufficient balance");
    entryStake = paid;
    s.currentRound.sessionStake = paid;
  } else {
    const locked = Number(s.currentRound.sessionStake || s.currentRound.users?.[0]?.betAmount || 0);
    if (!Number.isFinite(locked) || locked <= 0) {
      throw new Error("Round stake missing — refresh and try again");
    }
    entryStake = 0;
  }

  const parsedStep = Number(targetStep);
  if (!Number.isInteger(parsedStep) || parsedStep < 1 || parsedStep > TOTAL_STEPS) {
    throw new Error(`Invalid step. Choose 1-${TOTAL_STEPS}`);
  }

  const nextRequiredStep = betsSoFar + 1;
  if (parsedStep !== nextRequiredStep) {
    throw new Error(`Use step ${nextRequiredStep} for your next bet (one bet per step).`);
  }

  const isBot = Number(user.partnerLevel ?? 0) === 0;
  const multiplier = multiplierForStep(parsedStep);

  const selectionMax = Math.max(MIN_CLOUDS, Math.min(MAX_CLOUDS, s.currentClouds));
  const used = new Set(
    Array.isArray(s.selectedCloudTrail) ? s.selectedCloudTrail.map((n) => Number(n)) : []
  );
  const candidates = [];
  for (let i = 1; i <= selectionMax; i += 1) {
    if (!used.has(i)) candidates.push(i);
  }
  const selectedCloud =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : Math.floor(Math.random() * selectionMax) + 1;

  const prevMultipliers = Array.isArray(s.currentCloudMultipliers) ? [...s.currentCloudMultipliers] : [];
  s.currentClouds = Math.min(MAX_CLOUDS, Math.max(MIN_CLOUDS, s.currentClouds) + CLOUDS_PER_STEP);
  s.currentCloudMultipliers = extendCloudMultipliers(prevMultipliers, s.currentClouds);

  const selectedCloudStep = Math.max(1, Math.ceil(selectedCloud / CLOUDS_PER_STEP));
  const selectedCloudMultiplier = Number(s.currentCloudMultipliers[selectedCloud - 1] ?? 0);
  s.selectedCloudTrail = [...s.selectedCloudTrail, selectedCloud].slice(-48);

  if (!isBot && betsSoFar === 0 && entryStake > 0) {
    user.balance = round2(user.balance - entryStake);
    user.totalBet = round2((user.totalBet || 0) + entryStake);
    user.refreshBet = round2((user.refreshBet || 0) + entryStake);
    user.totalhistory.push({
      amount: -entryStake,
      date: new Date(),
      type: "cloudSpread",
    });
  }
  await user.save();

  const stakeForRow = Number(s.currentRound.sessionStake || entryStake || 0);

  /** CloudSpreadHistory rows are written on cash-out (settle), not on each play. */
  s.currentRound.totalBet = round2(Number(s.currentRound.totalBet || 0) + entryStake);
  s.currentRound.users = Array.isArray(s.currentRound.users) ? s.currentRound.users : [];
  const storedBetId = buildBetId();
  s.currentRound.users.push({
    betId: storedBetId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    targetStep: parsedStep,
    targetMultiplier: multiplier,
    selectedCloudMultiplier,
    betAmount: entryStake,
    isBot,
  });
  persistSessionToRound(s);
  await s.currentRound.save();

  const row = {
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    amount: entryStake,
    betAmount: entryStake,
    targetStep: parsedStep,
    targetMultiplier: multiplier,
    selectedCloud,
    selectedCloudStep,
    selectedCloudMultiplier,
    betId: storedBetId,
    isBot,
  };

  return {
    row,
    round: s.currentRound,
    betId: storedBetId,
    betAmount: entryStake,
    multiplier,
    selectedCloud,
    selectedCloudStep,
    selectedCloudMultiplier,
    betsThisRound: countUserBetsInRound(uid),
  };
}

export async function getCloudSpreadUserHistory(userId, limit = 30) {
  return CloudSpreadHistory.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

/**
 * @param {{ liveOnly?: boolean }} opts — live feed: cash-out rows + bots (skip legacy per-step rows).
 */
export async function getCloudSpreadRoundHistory(limit = 50, opts = {}) {
  const { liveOnly = false } = opts;
  const filter = liveOnly
    ? { $or: [{ isCashOutSummary: true }, { isBot: true }] }
    : {};
  return CloudSpreadHistory.find(filter).sort({ createdAt: -1 }).limit(limit);
}

export async function startCloudSpreadGameLoop() {
  if (timer) return;
  await ensureCloudSpreadHistoryIndexes();
  await ensureCloudSpreadRoundIndexes();
  timer = setInterval(async () => {
    try {
      for (const userId of sessions.keys()) {
        await maybeAdvanceResultPhase(userId);
      }
    } catch (err) {
      console.error("[cloudSpreadGame] loop error:", err);
    }
  }, 1000);
}

export async function cashOutCloudSpreadRound(userId) {
  if (!userId) throw new Error("Round is not ready");
  await ensureActiveRound(userId);
  const s = getSession(userId);
  if (!s.currentRound) throw new Error("Round is not ready");
  const mine = (s.currentRound.users || []).filter((u) => String(u.userId) === String(userId));
  if (!mine.length) {
    throw new Error("Pay and play at least once before cash out");
  }
  if (s.currentRound.phase !== "betting") {
    await advanceToNextBettingRound(userId);
    const state = await getCloudSpreadStateSnapshot(userId);
    return { state, alreadySettled: true };
  }
  await settleRound(userId);
  await advanceToNextBettingRound(userId);
  const state = await getCloudSpreadStateSnapshot(userId);
  return { state, alreadySettled: false };
}

export async function maybeBustSettleCloudSpread(selectedCloudMultiplier, userId) {
  const m = Number(selectedCloudMultiplier);
  if (!userId) return;
  const s = getSession(userId);
  if (s.settled || !s.currentRound || s.currentRound.phase !== "betting") return;
  if (!Number.isFinite(m) || m > 0) return;
  await settleRound(userId);
  await advanceToNextBettingRound(userId);
}
