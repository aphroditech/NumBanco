import CloudSpreadRound from "../../models/CloudSpreadRound.js";
import CloudSpreadHistory from "../../models/CloudSpreadHistory.js";
import User from "../../models/User.js";

const TOTAL_STEPS = 8;
const CLOUDS_PER_STEP = 10;
const MIN_CLOUDS = CLOUDS_PER_STEP;
const MAX_CLOUDS = TOTAL_STEPS * CLOUDS_PER_STEP;
const ROUND_TIMEOUT_MS = 45000;
const RESULT_MS = 3000;

const CHANNEL_NAME = "cloudSpreadGame";
const EVENT_STATE = "CLOUD_SPREAD_STATE";
const EVENT_NEW_BET = "CLOUD_SPREAD_NEW_BET";
const EVENT_RESULT = "CLOUD_SPREAD_RESULT";

let timer = null;
let currentRound = null;
let liveUsers = [];
let settled = false;
let settledAtMs = 0;
let currentClouds = 0;
let selectedCloudTrail = [];
let currentCloudMultipliers = [];

function round2(v) {
  return Math.round(v * 100) / 100;
}

function buildBetId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function multiplierForStep(step) {
  return 2 ** Number(step);
}

/**
 * Each cloud index (1..N) belongs to a step band: clouds 1–10 => step 1 (max x2),
 * 11–20 => step 2 (max x4), etc. Multiplier is random in [0, max for that band].
 * This avoids using the *global* step (after +10) for every cloud, which wrongly
 * allowed e.g. x2.29 on a step-1 cloud when total clouds had already reached 20.
 */
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

/** Keep existing multipliers for clouds 1..prev.length; only roll random for newly added clouds. */
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

function countUserBetsInRound(userId) {
  if (!currentRound || !userId) return 0;
  return (currentRound.users || []).filter((u) => String(u.userId) === String(userId)).length;
}

function pickCrashStep() {
  const pool = [1, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8];
  return pool[Math.floor(Math.random() * pool.length)];
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

async function publish(ably, event, data) {
  if (!ably) return;
  const channel = ably.channels.get(CHANNEL_NAME);
  await channel.publish(event, data);
}

async function createRound() {
  const latest = await CloudSpreadRound.findOne({}).sort({ roundId: -1 });
  const roundId = latest?.roundId ? latest.roundId + 1 : 1;
  const now = new Date();
  const runStartAt = now;
  const endAt = new Date(now.getTime() + ROUND_TIMEOUT_MS + RESULT_MS);
  const crashStep = pickCrashStep();

  const round = await CloudSpreadRound.create({
    roundId,
    phase: "betting",
    startAt: now,
    runStartAt,
    endAt,
    crashStep,
    finalStep: 0,
    finalClouds: 0,
    users: [],
    totalBet: 0,
  });

  liveUsers = [];
  settled = false;
  settledAtMs = 0;
  currentClouds = MIN_CLOUDS;
  selectedCloudTrail = [];
  currentCloudMultipliers = buildCloudMultipliers(currentClouds);
  return round;
}

async function settleRound(ably) {
  if (!currentRound || settled) return;
  settled = true;
  settledAtMs = Date.now();

  const bets = Array.isArray(currentRound.users) ? currentRound.users : [];
  const finalStep = Number(currentRound.crashStep || 1);
  const finalClouds = currentClouds;

  currentRound.phase = "result";
  currentRound.finalStep = finalStep;
  currentRound.finalClouds = finalClouds;
  await currentRound.save();

  for (const bet of bets) {
    const isWin = Number(bet.targetStep) <= finalStep;
    const winAmount = isWin ? round2(Number(bet.betAmount) * Number(bet.targetMultiplier)) : 0;

    const user = await User.findOne({ userId: bet.userId });
    if (!user) continue;

    if (!bet.isBot && winAmount > 0) {
      user.balance = round2(user.balance + winAmount);
      user.totalEarn = round2((user.totalEarn || 0) + winAmount);
    }

    if (!bet.isBot) {
      user.totalhistory.push({
        amount: winAmount > 0 ? winAmount : -bet.betAmount,
        date: new Date(),
        type: "cloudSpread",
      });
      await user.save();

      if (bet.betId) {
        await CloudSpreadHistory.updateOne({ _id: bet.betId }, { $set: { winAmount } });
      }
    }
  }

  await publish(ably, EVENT_RESULT, {
    roundId: currentRound.roundId,
    phase: "result",
    finalStep,
    finalClouds,
    crashStep: finalStep,
    liveUsers,
    selectedClouds: selectedCloudTrail,
    cloudMultipliers: currentCloudMultipliers,
  });
}

export async function getCloudSpreadStateSnapshot(forUserId = null) {
  if (!currentRound) return null;
  const phase = currentRound.phase || "betting";
  const currentStep = getCurrentStepFromClouds(Math.max(MIN_CLOUDS, currentClouds));
  const clouds = Math.max(MIN_CLOUDS, currentClouds);
  const maxMultiplier = currentStep > 0 ? multiplierForStep(currentStep) : 1;
  const resultElapsedMs = settledAtMs > 0 ? Math.max(0, Date.now() - settledAtMs) : 0;
  // No auto-timeout while playing — round ends only on Cash Out or 0x bust.
  const timeLeftMs =
    phase === "result" ? Math.max(0, RESULT_MS - resultElapsedMs) : null;

  const snapshot = {
    roundId: currentRound.roundId,
    phase,
    timeLeftMs,
    roundStartAtMs: currentRound.startAt?.getTime?.() ?? Date.now(),
    totalSteps: TOTAL_STEPS,
    maxBetsPerRound: TOTAL_STEPS,
    cloudsPerStep: CLOUDS_PER_STEP,
    currentStep,
    currentClouds: clouds,
    maxMultiplier,
    cloudMultipliers: currentCloudMultipliers,
    crashStep: phase === "result" ? Number(currentRound.crashStep || 1) : null,
    liveUsers,
    selectedClouds: selectedCloudTrail,
    totalBet: Number(currentRound.totalBet || 0),
    timers: {
      bettingSeconds: null,
      stepSeconds: 0,
      resultSeconds: RESULT_MS / 1000,
      totalSeconds: null,
    },
  };
  if (forUserId) {
    snapshot.myBetCount = countUserBetsInRound(forUserId);
  }
  return snapshot;
}

export async function placeCloudSpreadBet({ user, amount, targetStep }) {
  if (!currentRound) throw new Error("Round is not ready");
  if (currentRound.phase !== "betting") throw new Error("Betting phase is closed");

  const betsSoFar = countUserBetsInRound(user.userId);
  if (betsSoFar >= TOTAL_STEPS) {
    throw new Error(`Maximum ${TOTAL_STEPS} bets per round`);
  }

  const parsedAmount = round2(Number(amount));
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0.1) throw new Error("Minimum amount is 0.1");
  if (user.balance < parsedAmount) throw new Error("Insufficient balance");

  const parsedStep = Number(targetStep);
  if (!Number.isInteger(parsedStep) || parsedStep < 1 || parsedStep > TOTAL_STEPS) {
    throw new Error(`Invalid step. Choose 1-${TOTAL_STEPS}`);
  }

  // One play per step: 1st bet → step 1, 2nd → step 2, …, 8th → step 8.
  const nextRequiredStep = betsSoFar + 1;
  if (parsedStep !== nextRequiredStep) {
    throw new Error(`Use step ${nextRequiredStep} for your next bet (one bet per step).`);
  }

  const isBot = Number(user.partnerLevel ?? 0) === 0;
  const multiplier = multiplierForStep(parsedStep);

  // Pick only among clouds that are visible *before* this bet adds the next batch:
  // 1st click → random from 1–10, then clouds become 20.
  // 2nd click → random from 1–20, then clouds become 30. etc.
  const selectionMax = Math.max(MIN_CLOUDS, Math.min(MAX_CLOUDS, currentClouds));
  const used = new Set(
    Array.isArray(selectedCloudTrail) ? selectedCloudTrail.map((n) => Number(n)) : []
  );
  const candidates = [];
  for (let i = 1; i <= selectionMax; i += 1) {
    if (!used.has(i)) candidates.push(i);
  }
  const selectedCloud =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : Math.floor(Math.random() * selectionMax) + 1;

  const prevMultipliers = Array.isArray(currentCloudMultipliers) ? [...currentCloudMultipliers] : [];
  currentClouds = Math.min(MAX_CLOUDS, Math.max(MIN_CLOUDS, currentClouds) + CLOUDS_PER_STEP);
  // Do not re-roll multipliers for clouds that already existed — only new slots get new random values.
  currentCloudMultipliers = extendCloudMultipliers(prevMultipliers, currentClouds);

  const selectedCloudStep = Math.max(1, Math.ceil(selectedCloud / CLOUDS_PER_STEP));
  const selectedCloudMultiplier = Number(currentCloudMultipliers[selectedCloud - 1] ?? 0);
  selectedCloudTrail = [...selectedCloudTrail, selectedCloud].slice(-48);

  if (!isBot) {
    user.balance = round2(user.balance - parsedAmount);
    user.totalBet = round2((user.totalBet || 0) + parsedAmount);
    user.refreshBet = round2((user.refreshBet || 0) + parsedAmount);
    user.totalhistory.push({
      amount: -parsedAmount,
      date: new Date(),
      type: "cloudSpread",
    });
  }
  await user.save();

  const betDoc = isBot
    ? null
    : await CloudSpreadHistory.create({
        roundId: currentRound.roundId,
        userId: user.userId,
        userName: user.altas,
        avatar: user.avatar,
        targetStep: parsedStep,
        targetMultiplier: multiplier,
        betAmount: parsedAmount,
        winAmount: 0,
      });

  currentRound.totalBet = round2(Number(currentRound.totalBet || 0) + parsedAmount);
  currentRound.users = Array.isArray(currentRound.users) ? currentRound.users : [];
  const storedBetId = betDoc?._id ? String(betDoc._id) : buildBetId();
  currentRound.users.push({
    betId: storedBetId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    targetStep: parsedStep,
    targetMultiplier: multiplier,
    betAmount: parsedAmount,
    isBot,
  });
  await currentRound.save();

  const row = {
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    amount: parsedAmount,
    betAmount: parsedAmount,
    targetStep: parsedStep,
    targetMultiplier: multiplier,
    selectedCloud,
    selectedCloudStep,
    selectedCloudMultiplier,
    betId: storedBetId,
    isBot,
  };
  liveUsers = [row, ...liveUsers];
  return {
    row,
    round: currentRound,
    betId: storedBetId,
    betAmount: parsedAmount,
    multiplier,
    selectedCloud,
    selectedCloudStep,
    selectedCloudMultiplier,
    betsThisRound: countUserBetsInRound(user.userId),
  };
}

export async function getCloudSpreadUserHistory(userId, limit = 30) {
  return CloudSpreadHistory.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

export async function getCloudSpreadRoundHistory(limit = 30) {
  return CloudSpreadHistory.find({}).sort({ createdAt: -1 }).limit(limit);
}

export async function startCloudSpreadGameLoop(ably) {
  if (timer) return;
  await ensureCloudSpreadHistoryIndexes();
  currentRound = await createRound();
  await publish(ably, EVENT_STATE, await getCloudSpreadStateSnapshot());

  timer = setInterval(async () => {
    try {
      if (!currentRound) return;

      await publish(ably, EVENT_STATE, await getCloudSpreadStateSnapshot());

      if (settled && settledAtMs > 0 && Date.now() - settledAtMs >= RESULT_MS) {
        currentRound = await createRound();
        await publish(ably, EVENT_STATE, await getCloudSpreadStateSnapshot());
      }
    } catch (err) {
      console.error("[cloudSpreadGame] loop error:", err);
    }
  }, 1000);
}

export async function publishCloudSpreadBetEvent(ably, row, round) {
  await publish(ably, EVENT_NEW_BET, {
    ...row,
    roundId: round.roundId,
    totalBet: round.totalBet || 0,
    currentClouds,
    currentStep: getCurrentStepFromClouds(currentClouds),
    selectedClouds: selectedCloudTrail,
    cloudMultipliers: currentCloudMultipliers,
    userBetCount: countUserBetsInRound(row.userId),
  });
}

export async function cashOutCloudSpreadRound(ably) {
  if (!currentRound) throw new Error("Round is not ready");
  if (currentRound.phase !== "betting") throw new Error("Round already settled");
  await settleRound(ably);
  await publish(ably, EVENT_STATE, await getCloudSpreadStateSnapshot());
  return getCloudSpreadStateSnapshot();
}

/** End round when selected cloud multiplier is 0 (0.0x bust). */
export async function maybeBustSettleCloudSpread(ably, selectedCloudMultiplier) {
  const m = Number(selectedCloudMultiplier);
  if (!ably || settled || !currentRound || currentRound.phase !== "betting") return;
  if (!Number.isFinite(m) || m > 0) return;
  await settleRound(ably);
  await publish(ably, EVENT_STATE, await getCloudSpreadStateSnapshot());
}
