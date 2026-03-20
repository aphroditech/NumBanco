import GravityRound from "../../models/GravityRound.js";
import GravityHistory from "../../models/GravityHistory.js";
import User from "../../models/User.js";

const ROUND_MS = 18000;
const BETTING_MS = 10000;
const VIEWING_MS = 5000;
const GRAPH_FLOW_SECONDS = 15;
const RESULT_MS = 3000;

const CHANNEL_NAME = "gravityGame";
const EVENT_STATE = "GRAVITY_STATE";
const EVENT_NEW_BET = "GRAVITY_NEW_BET";
const EVENT_RESULT = "GRAVITY_RESULT";

let timer = null;
let currentRound = null;
let liveUsers = [];
let settled = false;
let lastBroadcastPhase = null;

function round2(v) {
  return Math.round(v * 100) / 100;
}

async function ensureGravityHistoryIndexes() {
  try {
    const indexNameToDrop = "roundId_1_userId_1";
    const indexes = await GravityHistory.collection.indexes();
    const hasOldIndex = indexes.some((ix) => ix?.name === indexNameToDrop);

    if (hasOldIndex) {
      console.log(`[gravity] Dropping stale GravityHistory unique index: ${indexNameToDrop}`);
      await GravityHistory.collection.dropIndex(indexNameToDrop);
    }

    // Ensure the new unique index exists: { roundId, userId, direction }
    await GravityHistory.syncIndexes();
  } catch (err) {
    console.warn("[gravity] ensureGravityHistoryIndexes failed:", err?.message || err);
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function buildGraphPoints() {
  // First build coarse points each 1 second (t=0..15),
  // then interpolate to dense points with step 0.1s (151 points total).
  const coarse = [];
  // Keep values in [80, 100], but avoid hard clamping causing flat 80/100 runs.
  // We generate an underlying "raw" random walk, then map it with tanh into [80, 100].
  const MEAN_LEVEL = 90;
  const BAND = 10; // 90 +/- 10 => [80, 100]
  const TANH_SCALE = 6;

  let raw = randomBetween(-2, 2);
  let value = round2(MEAN_LEVEL + BAND * Math.tanh(raw / TANH_SCALE));
  coarse.push({ t: 0, value });

  for (let i = 1; i <= GRAPH_FLOW_SECONDS; i += 1) {
    // Underlying motion (kept moderate so tanh doesn't saturate).
    let deltaRaw = randomBetween(-1.8, 1.8);

    // Occasional spikes, but damped before mapping.
    if (i >= 2 && i <= GRAPH_FLOW_SECONDS - 2) {
      const shockRoll = Math.random();
      if (shockRoll < 0.20) {
        deltaRaw += randomBetween(-5, 5) * 0.35;
      } else if (shockRoll < 0.32) {
        deltaRaw += randomBetween(-3, 3) * 0.25;
      }
    }

    raw = raw + deltaRaw;
    // Mean reversion toward 0 (center of the tanh mapping).
    raw = raw + (0 - raw) * 0.08;

    value = round2(MEAN_LEVEL + BAND * Math.tanh(raw / TANH_SCALE));
    coarse.push({ t: i, value });
  }

  const STEP = 0.1;
  const DENSE_POINTS = Math.round(GRAPH_FLOW_SECONDS / STEP); // 150
  const dense = [];

  for (let k = 0; k <= DENSE_POINTS; k += 1) {
    const t = round2(k * STEP); // 0..15
    const i = Math.min(GRAPH_FLOW_SECONDS - 1, Math.floor(t));
    const frac = t - i;
    const a = coarse[i];
    const b = coarse[i + 1];
    const v = a.value + (b.value - a.value) * frac;
    dense.push({ t, value: round2(v) });
  }

  return dense;
}

async function publish(ably, event, data) {
  if (!ably) return;
  const channel = ably.channels.get(CHANNEL_NAME);
  await channel.publish(event, data);
}

function getPhase(elapsedMs) {
  if (elapsedMs < BETTING_MS) return "betting";
  if (elapsedMs < BETTING_MS + VIEWING_MS) return "viewing";
  if (elapsedMs < ROUND_MS) return "result";
  return "closed";
}

function getVisiblePoints(points, elapsedMs) {
  if (elapsedMs >= GRAPH_FLOW_SECONDS * 1000) return points;
  const visibleCount = Math.max(1, Math.floor(elapsedMs / 1000) + 1);
  return points.slice(0, visibleCount);
}

async function settleRound(ably) {
  if (!currentRound || settled) return;
  settled = true;

  const points = currentRound.graphPoints || [];
  const first = points[0]?.value ?? 50;
  const last = points[points.length - 1]?.value ?? first;
  const result = last >= first ? "up" : "down";

  currentRound.result = result;
  currentRound.endValue = last;
  currentRound.phase = "result";
  await currentRound.save();

  const bets = await GravityHistory.find({ roundId: currentRound.roundId });
  for (const bet of bets) {
    const isWin = bet.direction === result;
    const winAmount = isWin ? round2(bet.betAmount * 1.95) : 0;
    bet.winAmount = winAmount;
    await bet.save();

    const user = await User.findOne({ userId: bet.userId });
    if (user) {
      const profit = winAmount > 0 ? winAmount - bet.betAmount : -bet.betAmount;
      if (winAmount > 0) {
        user.balance = round2(user.balance + winAmount);
        user.totalEarn = round2((user.totalEarn || 0) + winAmount);

        // Create a user notification for winning the gravity round.
        // Navbar notifications are sourced from user.notification.
        user.notification = user.notification || [];
        user.notification.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          notification: `Gravity win! +$${round2(winAmount).toFixed(2)} (Round ${currentRound.roundId})`,
          from: "gravity",
          to: "",
          status: "success",
          unread: true,
        });
      }

      user.totalhistory.push({
        amount: winAmount > 0 ? winAmount : -bet.betAmount,
        date: new Date(),
        type: "gravity",
      });
      user.updownHistory.push({
        roundId: currentRound.roundId,
        direction: bet.direction,
        amount: bet.betAmount,
        result,
        profit,
        createAt: new Date(),
      });
      await user.save();
    }
  }

  await publish(ably, EVENT_RESULT, {
    roundId: currentRound.roundId,
    result,
    endValue: last,
    upTotalBet: currentRound.upTotalBet,
    downTotalBet: currentRound.downTotalBet,
  });
}

async function createRound() {
  const latest = await GravityRound.findOne({}).sort({ roundId: -1 });
  const roundId = latest?.roundId ? latest.roundId + 1 : 1;
  const now = new Date();
  const settleAt = new Date(now.getTime() + BETTING_MS + VIEWING_MS);
  const endAt = new Date(now.getTime() + ROUND_MS);
  const graphPoints = buildGraphPoints();

  const round = await GravityRound.create({
    roundId,
    phase: "betting",
    startAt: now,
    settleAt,
    endAt,
    startValue: graphPoints[0].value,
    graphPoints,
  });

  liveUsers = [];
  settled = false;
  return round;
}

export async function getGravityStateSnapshot() {
  if (!currentRound) return null;
  const elapsedMs = Math.max(0, Date.now() - new Date(currentRound.startAt).getTime());
  const phase = getPhase(elapsedMs);
  const points = currentRound.graphPoints || [];
  const timeLeftMs = Math.max(
    0,
    phase === "betting"
      ? BETTING_MS - elapsedMs
      : phase === "viewing"
      ? BETTING_MS + VIEWING_MS - elapsedMs
      : ROUND_MS - elapsedMs
  );

  return {
    roundId: currentRound.roundId,
    phase,
    timeLeftMs,
    roundStartAtMs: currentRound.startAt?.getTime?.() ?? Date.now(),
    startValue: currentRound.startValue,
    endValue: currentRound.endValue ?? points[points.length - 1]?.value ?? currentRound.startValue,
    result: currentRound.result || null,
    points,
    upTotalBet: currentRound.upTotalBet || 0,
    downTotalBet: currentRound.downTotalBet || 0,
    liveUsers,
    timers: {
      bettingSeconds: BETTING_MS / 1000,
      viewingSeconds: VIEWING_MS / 1000,
      resultSeconds: RESULT_MS / 1000,
      graphSeconds: GRAPH_FLOW_SECONDS,
      totalSeconds: ROUND_MS / 1000,
    },
  };
}

export async function placeGravityBet({ user, amount, direction }) {
  if (!currentRound) {
    throw new Error("Round is not ready");
  }

  const elapsedMs = Math.max(0, Date.now() - new Date(currentRound.startAt).getTime());
  if (getPhase(elapsedMs) !== "betting") {
    throw new Error("Betting phase is closed");
  }

  const parsedAmount = round2(Number(amount));
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0.1) {
    throw new Error("Minimum amount is 0.1");
  }
  if (!["up", "down"].includes(direction)) {
    throw new Error("Invalid direction");
  }
  if (user.balance < parsedAmount) {
    throw new Error("Insufficient balance");
  }

  const exists = await GravityHistory.findOne({
    roundId: currentRound.roundId,
    userId: user.userId,
    direction,
  });
  if (exists) {
    throw new Error("You already placed this side bet in this round");
  }

  user.balance = round2(user.balance - parsedAmount);
  user.totalBet = round2((user.totalBet || 0) + parsedAmount);
  user.refreshBet = round2((user.refreshBet || 0) + parsedAmount);
  user.totalhistory.push({
    amount: -parsedAmount,
    date: new Date(),
    type: "gravity",
  });
  await user.save();

  const createdBet = await GravityHistory.create({
    roundId: currentRound.roundId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    betAmount: parsedAmount,
    winAmount: 0,
    direction,
  });

  if (direction === "up") currentRound.upTotalBet = round2((currentRound.upTotalBet || 0) + parsedAmount);
  if (direction === "down") currentRound.downTotalBet = round2((currentRound.downTotalBet || 0) + parsedAmount);
  await currentRound.save();

  const row = {
    userName: user.altas,
    avatar: user.avatar,
    amount: parsedAmount,
    direction,
    userId: user.userId,
    betId: createdBet?._id,
  };
  liveUsers = [row, ...liveUsers].slice(0, 30);
  return { row, round: currentRound, betId: createdBet?._id, betAmount: parsedAmount, direction };
}

export async function getGravityUserHistory(userId, limit = 30) {
  return GravityHistory.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

export async function getGravityRoundHistory(limit = 30) {
  return GravityHistory.find({}).sort({ createdAt: -1 }).limit(limit);
}

export async function startGravityGameLoop(ably) {
  if (timer) return;
  await ensureGravityHistoryIndexes();
  currentRound = await createRound();

  lastBroadcastPhase = null;
  timer = setInterval(async () => {
    try {
      if (!currentRound) return;
      const elapsedMs = Math.max(0, Date.now() - new Date(currentRound.startAt).getTime());
      const phase = getPhase(elapsedMs);
      const nextPhase = phase === "closed" ? "result" : phase;
      if (nextPhase !== lastBroadcastPhase) {
        lastBroadcastPhase = nextPhase;
        currentRound.phase = nextPhase;
        await publish(ably, EVENT_STATE, {
          roundId: currentRound.roundId,
          phase: nextPhase,
          timeLeftMs:
            nextPhase === "betting"
              ? BETTING_MS - elapsedMs
              : nextPhase === "viewing"
              ? BETTING_MS + VIEWING_MS - elapsedMs
              : ROUND_MS - elapsedMs,
          roundStartAtMs: currentRound.startAt?.getTime?.() ?? Date.now(),
          points: currentRound.graphPoints || [],
          upTotalBet: currentRound.upTotalBet || 0,
          downTotalBet: currentRound.downTotalBet || 0,
          liveUsers,
        });
      }

      if (elapsedMs >= BETTING_MS + VIEWING_MS && !settled) {
        await settleRound(ably);
      }

      if (elapsedMs >= ROUND_MS) {
        currentRound.phase = "closed";
        await currentRound.save();
        currentRound = await createRound();
        await publish(ably, EVENT_STATE, await getGravityStateSnapshot());
      }
    } catch (err) {
      console.error("[gravityGame] loop error:", err);
    }
  }, 1000);
}

export async function publishGravityBetEvent(ably, row, round) {
  await publish(ably, EVENT_NEW_BET, {
    roundId: round.roundId,
    ...row,
    upTotalBet: round.upTotalBet || 0,
    downTotalBet: round.downTotalBet || 0,
  });
}
