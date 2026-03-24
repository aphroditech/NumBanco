import CloudSpreadRound from "../../models/CloudSpreadRound.js";
import CloudSpreadHistory from "../../models/CloudSpreadHistory.js";
import CloudSpreadSettings from "../../models/CloudSpreadSettings.js";
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

const DEFAULT_STEP_MULTIPLIER_PROFILES = [
  { step: 1, bands: [{ min: 0, max: 0, weight: 5 }, { min: 0, max: 1, weight: 45 }, { min: 1, max: 2, weight: 45 }] },
  { step: 2, bands: [{ min: 0, max: 0, weight: 10 }, { min: 0, max: 1, weight: 40 }, { min: 1, max: 2, weight: 35 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 35 }] },
  { step: 3, bands: [{ min: 0, max: 0, weight: 15 }, { min: 0, max: 1, weight: 35 }, { min: 1, max: 2, weight: 30 }, { min: 2, max: 3, weight: 10 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 4, bands: [{ min: 0, max: 0, weight: 15 }, { min: 0, max: 1, weight: 35 }, { min: 1, max: 2, weight: 25 }, { min: 2, max: 3, weight: 10 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 5, bands: [{ min: 0, max: 0, weight: 25 }, { min: 0, max: 1, weight: 40 }, { min: 1, max: 2, weight: 20 }, { min: 2, max: 3, weight: 10 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 6, bands: [{ min: 0, max: 0, weight: 30 }, { min: 0, max: 1, weight: 35 }, { min: 1, max: 2, weight: 20 }, { min: 2, max: 3, weight: 10 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 7, bands: [{ min: 0, max: 0, weight: 45 }, { min: 0, max: 1, weight: 25 }, { min: 1, max: 2, weight: 25 }, { min: 2, max: 3, weight: 10 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 8, bands: [{ min: 0, max: 0, weight: 40 }, { min: 0, max: 1, weight: 25 }, { min: 1, max: 2, weight: 20 }, { min: 2, max: 3, weight: 10 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
];

const PROFILE_REFRESH_MS = 10_000;
let stepMultiplierProfilesCache = DEFAULT_STEP_MULTIPLIER_PROFILES;
let stepMultiplierProfilesLoadedAt = 0;
let mode1To2LimitCache = 1.2;
let mode2To1LimitCache = 0.7;

function normalizeStepProfiles(input) {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_STEP_MULTIPLIER_PROFILES;
  const out = [];
  for (const p of input) {
    const step = Number(p?.step);
    if (!Number.isInteger(step) || step < 1 || step > TOTAL_STEPS) continue;
    const bandsIn = Array.isArray(p?.bands) ? p.bands : [];
    const bands = bandsIn
      .map((b) => ({
        min: Number(b?.min),
        max: Number(b?.max),
        weight: Number(b?.weight),
      }))
      .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max) && Number.isFinite(b.weight) && b.weight > 0);
    if (!bands.length) continue;
    out.push({ step, bands: bands.map((b) => ({ min: Math.min(b.min, b.max), max: Math.max(b.min, b.max), weight: b.weight })) });
  }
  if (!out.length) return DEFAULT_STEP_MULTIPLIER_PROFILES;
  return out.sort((a, b) => a.step - b.step);
}

async function refreshStepMultiplierProfiles(force = false) {
  const now = Date.now();
  if (!force && now - stepMultiplierProfilesLoadedAt < PROFILE_REFRESH_MS) return;
  try {
    const settings = await CloudSpreadSettings.findOne().lean();
    const normalized = normalizeStepProfiles(settings?.stepMultiplierProfiles);
    stepMultiplierProfilesCache = normalized;
    mode1To2LimitCache = Number.isFinite(Number(settings?.limitMode1To2))
      ? Number(settings.limitMode1To2)
      : 1.2;
    mode2To1LimitCache = Number.isFinite(Number(settings?.limitMode2To1))
      ? Number(settings.limitMode2To1)
      : 0.7;
    stepMultiplierProfilesLoadedAt = now;
  } catch {
    stepMultiplierProfilesLoadedAt = now;
  }
}

function applyCloudModeFromTotals(user) {
  if (!user) return;
  const amount = Number(user.cloudAmount || 0);
  const win = Number(user.cloudWinAmount || 0);
  const mode = Number(user.cloudMode || 1);
  const limitUp = Number(mode1To2LimitCache || 1.2);
  const limitDown = Number(mode2To1LimitCache || 0.7);

  if (mode === 1) {
    if (amount * limitUp < win) user.cloudMode = 2;
    return;
  }
  if (mode === 2) {
    if (amount * limitDown > win) user.cloudMode = 1;
  }
}

function pickStepBandProfile(stepBand) {
  const s = Math.min(TOTAL_STEPS, Math.max(1, Number(stepBand) || 1));
  return (
    stepMultiplierProfilesCache.find((p) => Number(p.step) === s) ||
    DEFAULT_STEP_MULTIPLIER_PROFILES.find((p) => Number(p.step) === s) ||
    DEFAULT_STEP_MULTIPLIER_PROFILES[0]
  );
}

/** When `cloudMode === 2`: bump x0.00 band weight +5%, trim [1,2] band weight −5% (relative to each band’s weight). */
const CLOUD_MODE2_ZERO_WEIGHT_FACTOR = 1.05;
const CLOUD_MODE2_ONE_TWO_WEIGHT_FACTOR = 0.95;

function adjustBandsForCloudMode(bands, cloudMode) {
  if (Number(cloudMode) !== 2 || !Array.isArray(bands) || !bands.length) return bands;
  return bands.map((b) => {
    const lo = Math.min(Number(b.min), Number(b.max));
    const hi = Math.max(Number(b.min), Number(b.max));
    const w = Number(b.weight);
    if (!Number.isFinite(w) || w <= 0) return { min: lo, max: hi, weight: b.weight };
    if (lo === 0 && hi === 0) {
      return { min: lo, max: hi, weight: w * CLOUD_MODE2_ZERO_WEIGHT_FACTOR };
    }
    if (lo === 1 && hi === 2) {
      return { min: lo, max: hi, weight: w * CLOUD_MODE2_ONE_TWO_WEIGHT_FACTOR };
    }
    return { min: lo, max: hi, weight: w };
  });
}

async function getUserCloudModeForSpread(userId) {
  if (!userId) return 1;
  try {
    const u = await User.findOne({ userId: String(userId) }).select("cloudMode").lean();
    return Number(u?.cloudMode) === 2 ? 2 : 1;
  } catch {
    return 1;
  }
}

function drawCloudMultiplier(stepBand, cloudMode = 1) {
  const profile = pickStepBandProfile(stepBand);
  let bands = Array.isArray(profile?.bands) ? profile.bands : [];
  bands = adjustBandsForCloudMode(bands, cloudMode);
  if (!bands.length) return 0;
  const totalWeight = bands.reduce((sum, b) => sum + Number(b.weight || 0), 0);
  if (!(totalWeight > 0)) return 0;
  let r = Math.random() * totalWeight;
  let chosen = bands[0];
  for (const b of bands) {
    r -= Number(b.weight || 0);
    if (r <= 0) {
      chosen = b;
      break;
    }
  }
  const lo = Number(chosen.min);
  const hi = Number(chosen.max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  if (hi <= lo) return round2(lo);
  return round2(lo + Math.random() * (hi - lo));
}

function buildCloudMultipliers(cloudCount, cloudMode = 1) {
  const count = Math.max(0, Number(cloudCount || 0));
  const mode = Number(cloudMode) === 2 ? 2 : 1;
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const cloudIndex = i + 1;
    const stepBand = Math.min(TOTAL_STEPS, Math.ceil(cloudIndex / CLOUDS_PER_STEP));
    list.push(drawCloudMultiplier(stepBand, mode));
  }
  return list;
}

function extendCloudMultipliers(prevList, newCount, cloudMode = 1) {
  const count = Math.max(0, Number(newCount || 0));
  const mode = Number(cloudMode) === 2 ? 2 : 1;
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
    list.push(drawCloudMultiplier(stepBand, mode));
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
    if (!Number.isFinite(m) || m < 0) {
      p *= 1;
      continue;
    }
    if (m === 0) {
      p = 0;
      break;
    }
    p *= m;
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

async function syncSessionFromRoundDoc(s, explicitCloudMode) {
  if (!s?.currentRound) return;
  let cloudMode = 1;
  if (explicitCloudMode !== undefined && explicitCloudMode !== null) {
    cloudMode = Number(explicitCloudMode) === 2 ? 2 : 1;
  } else if (s.currentRound.userId) {
    cloudMode = await getUserCloudModeForSpread(String(s.currentRound.userId));
  }
  const r = s.currentRound;
  s.currentClouds = Number(r.sessionClouds) >= MIN_CLOUDS ? r.sessionClouds : MIN_CLOUDS;
  s.selectedCloudTrail = Array.isArray(r.sessionTrail) ? [...r.sessionTrail] : [];
  const mults = Array.isArray(r.sessionMultipliers)
    ? r.sessionMultipliers.map((x) => round2(Number(x)))
    : [];
  if (mults.length >= s.currentClouds) {
    s.currentCloudMultipliers = mults.slice(0, s.currentClouds);
  } else {
    s.currentCloudMultipliers = extendCloudMultipliers(mults, s.currentClouds, cloudMode);
  }
}

async function hydrateSessionFromLatestRound(userId, s) {
  const uid = String(userId);
  const cloudMode = await getUserCloudModeForSpread(uid);
  const latest = await CloudSpreadRound.findOne({ userId: uid }).sort({ roundId: -1 });
  if (!latest) return;

  if (latest.phase === "betting") {
    s.currentRound = latest;
    s.settled = false;
    s.settledAtMs = 0;
    const n = (latest.users || []).length;
    const derivedClouds = Math.min(MAX_CLOUDS, MIN_CLOUDS + n * CLOUDS_PER_STEP);
    if (Number(latest.sessionClouds) >= MIN_CLOUDS) {
      await syncSessionFromRoundDoc(s, cloudMode);
    } else {
      s.currentClouds = derivedClouds;
      s.selectedCloudTrail = [];
      s.currentCloudMultipliers = extendCloudMultipliers([], s.currentClouds, cloudMode);
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
      await syncSessionFromRoundDoc(s, cloudMode);
    } else {
      s.currentClouds = Math.max(MIN_CLOUDS, Number(latest.finalClouds || MIN_CLOUDS));
      s.selectedCloudTrail = [];
      s.currentCloudMultipliers = buildCloudMultipliers(s.currentClouds, cloudMode);
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
  const cloudMode = await getUserCloudModeForSpread(uid);
  const sessionMultipliers = buildCloudMultipliers(MIN_CLOUDS, cloudMode);
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
  await syncSessionFromRoundDoc(s);
  persistSessionToRound(s);
  await s.currentRound.save();
}

async function ensureActiveRound(userId) {
  await refreshStepMultiplierProfiles();
  const s = getSession(userId);
  if (!s.currentRound) {
    await hydrateSessionFromLatestRound(userId, s);
  }
  await maybeAdvanceResultPhase(userId);
  if (!s.currentRound) {
    s.currentRound = await createRound(userId);
    s.settled = false;
    s.settledAtMs = 0;
    await syncSessionFromRoundDoc(s);
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
      user.cloudWinAmount = round2((user.cloudWinAmount || 0) + totalWin);
      user.totalhistory.push({
        amount: totalWin,
        date: new Date(),
        type: "cloudSpread",
      });
    }
    applyCloudModeFromTotals(user);

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

    // Avoid validating unrelated legacy subdocs (e.g. old minesHistory rows)
    // when Cloud Spread updates only cloud-related user fields.
    await user.save({ validateModifiedOnly: true });
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
    if (!Number.isFinite(m) || m < 0) {
      /* skip invalid */
    } else if (m === 0) {
      myMultProduct = 0;
      break;
    } else {
      myMultProduct *= m;
    }
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
  const spreadMode = Number(user.cloudMode || 1) === 2 ? 2 : 1;
  s.currentCloudMultipliers = extendCloudMultipliers(prevMultipliers, s.currentClouds, spreadMode);

  const selectedCloudStep = Math.max(1, Math.ceil(selectedCloud / CLOUDS_PER_STEP));
  const selectedCloudMultiplier = Number(s.currentCloudMultipliers[selectedCloud - 1] ?? 0);
  s.selectedCloudTrail = [...s.selectedCloudTrail, selectedCloud].slice(-48);

  if (!isBot && betsSoFar === 0 && entryStake > 0) {
    user.balance = round2(user.balance - entryStake);
    user.totalBet = round2((user.totalBet || 0) + entryStake);
    user.refreshBet = round2((user.refreshBet || 0) + entryStake);
    user.cloudAmount = round2((user.cloudAmount || 0) + entryStake);
    applyCloudModeFromTotals(user);
    user.totalhistory.push({
      amount: -entryStake,
      date: new Date(),
      type: "cloudSpread",
    });
  }
  // Cloud Spread only touches a subset of user fields here; validating only
  // modified paths prevents unrelated schema drift from blocking gameplay.
  await user.save({ validateModifiedOnly: true });

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
  await refreshStepMultiplierProfiles(true);
  timer = setInterval(async () => {
    try {
      await refreshStepMultiplierProfiles();
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

/**
 * Previously: cloud mult ≤ 0 ended the round immediately.
 * Product rule: x0.00 keeps the same round; player can continue (cash-out payout can be $0).
 */
export async function maybeBustSettleCloudSpread() {
  /* no-op */
}
