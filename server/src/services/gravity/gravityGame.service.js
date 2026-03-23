import GravityRound from "../../models/GravityRound.js";
import GravityHistory from "../../models/GravityHistory.js";
import GravityBot from "../../models/GravityBot.js";
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
let lockedRoundResult = null;
let settlePromise = null;
let settlingRoundId = null;
let loopInFlight = false;

function buildUserNotification(message, status = "success", from = "Gravity", to = "") {
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
          notification: buildUserNotification(message, status, "Gravity", userId),
        },
      }
    );
  } catch (e) {
    console.warn("[gravity] pushUserNotification failed:", e?.message || e);
  }
}

function buildBetId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

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
  // Gaussian-like distribution centered between min/max.
  // This reduces frequent extreme jumps and makes the graph movement feel more natural.
  const mean = (min + max) / 2;
  const range = max - min;
  const std = range / 6; // ~99.7% of values within [min,max] before clamping

  // Box–Muller transform for standard normal.
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const val = mean + z * std;
  return Math.min(max, Math.max(min, val));
}

function buildGraphPoints() {
  // First build coarse points each 1 second (t=0..15),
  // then interpolate to dense points with step 0.1s (151 points total).
  const coarse = [];
  // Keep values in [80, 100], but avoid saturation near 100.
  // We generate an underlying centered "raw" random walk, clamp it to avoid tanh saturation,
  // then map it smoothly into [80, 100] with tanh.
  const MEAN_LEVEL = 90;
  const BAND = 10; // 90 +/- 10 => [80, 100]
  const TANH_SCALE = 4.5;
  const RAW_MIN = -8;
  const RAW_MAX = 8;

  let raw = randomBetween(-4, 4);
  let value = round2(MEAN_LEVEL + BAND * Math.tanh(raw / TANH_SCALE));
  coarse.push({ t: 0, value });

  for (let i = 1; i <= GRAPH_FLOW_SECONDS; i += 1) {
    // Underlying motion (kept moderate so tanh doesn't saturate).
    let deltaRaw = randomBetween(-2.5, 2.5);

    // Occasional spikes, but damped before mapping.
    if (i >= 2 && i <= GRAPH_FLOW_SECONDS - 2) {
      const shockRoll = Math.random();
      if (shockRoll < 0.20) {
        deltaRaw += randomBetween(-7, 7) * 0.30;
      } else if (shockRoll < 0.32) {
        deltaRaw += randomBetween(-4, 4) * 0.22;
      }
    }

    raw = raw + deltaRaw;
    // Mean reversion toward 0 (center of the tanh mapping). Stronger reversion prevents drifting to 100.
    raw = raw + (0 - raw) * 0.18;
    raw = Math.min(RAW_MAX, Math.max(RAW_MIN, raw));

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

function decideContrarianResult(upTotalBet, downTotalBet) {
  if (upTotalBet > downTotalBet) return "down";
  if (downTotalBet > upTotalBet) return "up";
  return Math.random() < 0.5 ? "up" : "down";
}

async function prepareControlledTailAtBettingEnd() {
  if (!currentRound || !Array.isArray(currentRound.graphPoints) || currentRound.graphPoints.length < 2) return;
  const pts = currentRound.graphPoints;
  const upTotalBet = Number(currentRound.upTotalBet || 0);
  const downTotalBet = Number(currentRound.downTotalBet || 0);
  const first = Number(pts[0]?.value ?? currentRound.startValue ?? 90);

  // Lock result by contrarian bet totals.
  lockedRoundResult = decideContrarianResult(upTotalBet, downTotalBet);
  const result = lockedRoundResult;

  // Shape only viewing tail (10s -> 15s) so endpoint direction matches locked result,
  // while keeping natural up/down fluctuations.
  const tStartSec = BETTING_MS / 1000; // 10s
  const startIdx = Math.max(0, pts.findIndex((p) => Number(p?.t) >= tStartSec));
  if (startIdx < 0 || startIdx >= pts.length - 1) {
    currentRound.endValue = Number(pts[pts.length - 1]?.value ?? first);
    // Use updateOne to avoid ParallelSaveError with concurrent bet saves.
    await GravityRound.updateOne(
      { _id: currentRound._id },
      { $set: { endValue: currentRound.endValue } }
    );
    return;
  }

  const anchor = Number(pts[startIdx]?.value ?? first);
  // Build 10s->15s using the SAME model as early segment (coarse 1s random-walk + interpolation),
  // and retry until endpoint direction matches locked result.
  const MEAN_LEVEL = 90;
  const BAND = 10;
  const TANH_SCALE = 4.5;
  const RAW_MIN = -8;
  const RAW_MAX = 8;
  const desiredUp = result === "up";

  const clamp80_100 = (v) => Math.min(100, Math.max(80, round2(v)));
  const atanh = (x) => 0.5 * Math.log((1 + x) / (1 - x));

  const buildTailDense = () => {
    const x = Math.min(0.999, Math.max(-0.999, (anchor - MEAN_LEVEL) / BAND));
    let raw = TANH_SCALE * atanh(x);
    raw = Math.min(RAW_MAX, Math.max(RAW_MIN, raw));

    const coarseTail = [{ t: 10, value: clamp80_100(anchor) }];
    for (let i = 11; i <= GRAPH_FLOW_SECONDS; i += 1) {
      let deltaRaw = randomBetween(-2.5, 2.5);
      const shockRoll = Math.random();
      if (shockRoll < 0.20) deltaRaw += randomBetween(-7, 7) * 0.30;
      else if (shockRoll < 0.32) deltaRaw += randomBetween(-4, 4) * 0.22;

      raw = raw + deltaRaw;
      raw = raw + (0 - raw) * 0.18;
      raw = Math.min(RAW_MAX, Math.max(RAW_MIN, raw));

      const v = clamp80_100(MEAN_LEVEL + BAND * Math.tanh(raw / TANH_SCALE));
      coarseTail.push({ t: i, value: v });
    }

    const denseTail = [];
    const STEP = 0.1;
    const startT = 10;
    const denseCount = Math.round((GRAPH_FLOW_SECONDS - startT) / STEP); // 50
    for (let k = 0; k <= denseCount; k += 1) {
      const t = round2(startT + k * STEP); // 10..15
      const i = Math.min(GRAPH_FLOW_SECONDS - 1, Math.floor(t));
      const frac = t - i;
      const a = coarseTail[i - startT];
      const b = coarseTail[i - startT + 1];
      const v = a.value + (b.value - a.value) * frac;
      denseTail.push({ t, value: clamp80_100(v) });
    }
    return denseTail;
  };

  let chosenTail = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = buildTailDense();
    const end = Number(candidate[candidate.length - 1]?.value ?? anchor);
    if ((desiredUp && end > first) || (!desiredUp && end < first)) {
      chosenTail = candidate;
      break;
    }
    if (!chosenTail) chosenTail = candidate;
  }

  // If all retries miss direction due to range constraints, apply a very light smooth nudge.
  if (chosenTail) {
    const endNow = Number(chosenTail[chosenTail.length - 1]?.value ?? anchor);
    if ((desiredUp && !(endNow > first)) || (!desiredUp && !(endNow < first))) {
      const target = desiredUp ? Math.min(100, round2(first + 0.25)) : Math.max(80, round2(first - 0.25));
      const delta = target - endNow;
      for (let i = 0; i < chosenTail.length; i += 1) {
        const ratio = i / Math.max(1, chosenTail.length - 1);
        const eased = ratio * ratio * (3 - 2 * ratio);
        const v = Number(chosenTail[i].value) + delta * eased;
        chosenTail[i].value = clamp80_100(v);
      }
    }

    const valueByT = new Map(chosenTail.map((p) => [Number(p.t).toFixed(1), p.value]));
    for (let i = startIdx; i < pts.length; i += 1) {
      const key = Number(pts[i]?.t ?? 0).toFixed(1);
      if (valueByT.has(key)) pts[i].value = valueByT.get(key);
    }
  }

  currentRound.graphPoints = pts;
  currentRound.endValue = Number(pts[pts.length - 1]?.value ?? anchor);
  // Use updateOne to avoid ParallelSaveError with concurrent bet saves.
  await GravityRound.updateOne(
    { _id: currentRound._id },
    { $set: { graphPoints: currentRound.graphPoints, endValue: currentRound.endValue } }
  );
}

async function settleRound(ably) {
  if (!currentRound || settled) return;
  settled = true;

  const round = currentRound;
  settlingRoundId = round.roundId;

  // Expose in-flight settlement so we never save the same GravityRound doc twice in parallel.
  settlePromise = (async () => {
    const points = round.graphPoints || [];
    const first = points[0]?.value ?? 50;

    // Decide result based on total bets (contrarian):
    // - if UP bet amount is bigger -> DOWN wins
    // - if DOWN bet amount is bigger -> UP wins
    // - if equal -> random 50/50
    const upTotalBet = Number(round.upTotalBet || 0);
    const downTotalBet = Number(round.downTotalBet || 0);

    let result = lockedRoundResult || decideContrarianResult(upTotalBet, downTotalBet);

    // Keep graph data untouched at settle time.
    // This prevents any visible jump when flow ends.
    const endValue = Number(points[points.length - 1]?.value ?? first);

    round.result = result;
    round.startValue = first;
    round.endValue = endValue;
    round.phase = "result";
    await round.save();

    // Settle bets from the round document (bots + real users).
    const bets = Array.isArray(round.users) ? round.users : [];
    for (const bet of bets) {
      const isWin = bet.direction === result;
      const winAmount = isWin ? round2(bet.betAmount * 1.95) : 0;

      const user = await User.findOne({ userId: bet.userId });
      if (!user) continue;

      if (bet.isBot) {
        // Bots do not affect balances/history.
        continue;
      }

      // Real users: balance updates only happen on win.
      if (winAmount > 0) {
        user.balance = round2(user.balance + winAmount);
        user.totalEarn = round2((user.totalEarn || 0) + winAmount);

        user.notification.push(
          buildUserNotification(
            `You won $${Number(winAmount).toFixed(2)} in round ${round.roundId}`,
            "success",
            "Gravity",
            user.userId
          )
        );
      }

      const profit = winAmount > 0 ? winAmount - bet.betAmount : -bet.betAmount;

      user.totalhistory.push({
        amount: winAmount > 0 ? winAmount : -bet.betAmount,
        date: new Date(),
        type: "gravity",
      });
      user.updownHistory.push({
        roundId: round.roundId,
        direction: bet.direction,
        amount: bet.betAmount,
        result,
        profit,
        createAt: new Date(),
      });

      // Update GravityHistory winAmount for this real user's bet.
      if (bet.betId) {
        await GravityHistory.updateOne({ _id: bet.betId }, { $set: { winAmount } });
      }
      await user.save();
    }

    await publish(ably, EVENT_RESULT, {
      roundId: round.roundId,
      result,
      endValue: endValue,
      upTotalBet: round.upTotalBet,
      downTotalBet: round.downTotalBet,
      phase: "result",
      points: round.graphPoints || [],
      startValue: round.startValue,
    });
  })();

  try {
    await settlePromise;
  } finally {
    settlePromise = null;
    settlingRoundId = null;
  }
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
    users: [],
  });

  liveUsers = [];
  settled = false;
  lockedRoundResult = null;
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

  const isBot = Number(user.partnerLevel ?? 0) === 0;
  const exists = Array.isArray(currentRound.users)
    ? currentRound.users.some((b) => String(b.userId) === String(user.userId))
    : false;
  if (exists) throw new Error("You already placed a bet in this round");

  if (!isBot) {
    // Real users: deduct balance immediately.
    user.balance = round2(user.balance - parsedAmount);
    user.totalBet = round2((user.totalBet || 0) + parsedAmount);
    user.refreshBet = round2((user.refreshBet || 0) + parsedAmount);
    user.totalhistory.push({
      amount: -parsedAmount,
      date: new Date(),
      type: "gravity",
    });

    // Notification stored in User.notification[].
    const notif = buildUserNotification(
      `You bet $${parsedAmount.toFixed(2)} in round ${currentRound.roundId}`,
      "success",
      "Gravity",
      user.userId
    );
    user.notification.push(notif);
  }
  await user.save();

  const betId = isBot ? buildBetId() : undefined;
  const betDoc = isBot
    ? null
    : await GravityHistory.create({
        roundId: currentRound.roundId,
        userId: user.userId,
        userName: user.altas,
        avatar: user.avatar,
        betAmount: parsedAmount,
        winAmount: 0,
        direction,
      });

  if (direction === "up" && !isBot) currentRound.upTotalBet = round2((currentRound.upTotalBet || 0) + parsedAmount);
  if (direction === "down" && !isBot) currentRound.downTotalBet = round2((currentRound.downTotalBet || 0) + parsedAmount);

  currentRound.users = Array.isArray(currentRound.users) ? currentRound.users : [];

  const storedBetId = betDoc?._id ? String(betDoc._id) : String(betId);
  currentRound.users.push({
    betId: storedBetId,
    userId: user.userId,
    userName: user.altas,
    avatar: user.avatar,
    direction,
    betAmount: parsedAmount,
    isBot,
  });
  await currentRound.save();

  const row = {
    userName: user.altas,
    avatar: user.avatar,
    amount: parsedAmount,
    direction,
    userId: user.userId,
    betId: storedBetId,
    isBot,
  };
  // Keep the full list so the frontend can render all current round players.
  // (Client already dedupes and can scroll.)
  liveUsers = [row, ...liveUsers];
  return { row, round: currentRound, betId: storedBetId, betAmount: parsedAmount };
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

  // Publish phase changes and settle exactly at boundaries.
  // This reduces up to ~1s delay caused by the 1000ms interval tick.
  const scheduleRoundTimers = (roundForTimers) => {
    if (!roundForTimers?.startAt) return;
    const roundIdForTimers = roundForTimers.roundId;
    const startAtMs = roundForTimers.startAt.getTime();

    const publishPhase = async (phaseToSet) => {
      // Only act for the currently active round.
      if (!currentRound || currentRound.roundId !== roundIdForTimers) return;
      currentRound.phase = phaseToSet;
      await publish(ably, EVENT_STATE, await getGravityStateSnapshot());
    };

    // betting -> viewing
    const delayViewing = Math.max(0, startAtMs + BETTING_MS - Date.now());
    setTimeout(async () => {
      // Avoid duplicate publish: still update lastBroadcastPhase so interval won't re-publish.
      lastBroadcastPhase = "viewing";
      // Lock the round result and smoothly shape the remaining graph tail (10s -> 15s).
      await prepareControlledTailAtBettingEnd();
      await publishPhase("viewing");
    }, delayViewing);

    // viewing -> result (also settle bets)
    const delayResult = Math.max(0, startAtMs + BETTING_MS + VIEWING_MS - Date.now());
    setTimeout(async () => {
      lastBroadcastPhase = "result";
      // settleRound will publish EVENT_RESULT (with points).
      // settled=true prevents double-settlement.
      await settleRound(ably);
    }, delayResult);
  };

  scheduleRoundTimers(currentRound);

  // Bots place automatic bets during the betting phase.
  const getDefaultBotConfig = () => ({
    enabled: true,
    totalBots: 6,
    betsPerSecond: 1,
    upRatio: 0.5,
    downRatio: 0.5,
    minBet: 0.1,
    maxBet: 5,
    chanceToBet: 0.8,
  });

  let gravityBotConfig = getDefaultBotConfig();
  try {
    const cfg = await GravityBot.findOne({}).lean();
    if (cfg) gravityBotConfig = { ...gravityBotConfig, ...cfg };
  } catch {}

  let botUserIds = [];
  try {
    // Choose from the whole bot pool (no limit), then randomly sample.
    botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
  } catch {}

  let lastBotRefreshAt = 0;

  const sampleBotUserId = () => {
    if (!Array.isArray(botUserIds) || botUserIds.length === 0) return null;
    const idx = Math.floor(Math.random() * botUserIds.length);
    return botUserIds[idx]?.userId ?? null;
  };
  timer = setInterval(async () => {
    if (loopInFlight) return;
    loopInFlight = true;
    try {
      if (!currentRound) return;
      const roundAtTick = currentRound;
      const elapsedMs = Math.max(0, Date.now() - new Date(roundAtTick.startAt).getTime());
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

      // --- Gravity bots place bets during betting phase ---
      if (phase === "betting" && gravityBotConfig?.enabled) {
        // refresh bot pool/config occasionally
        if (Date.now() - lastBotRefreshAt > 10000) {
          lastBotRefreshAt = Date.now();
          try {
            const cfg = await GravityBot.findOne({}).lean();
            if (cfg) gravityBotConfig = { ...gravityBotConfig, ...cfg };
          } catch {}

          try {
            botUserIds = await User.find({ partnerLevel: 0 }).select("userId").lean();
          } catch {}
        }

        const chanceToBet = Number(gravityBotConfig?.chanceToBet ?? 0.8);
        const roll = Math.random();
        if (!Number.isFinite(chanceToBet) || roll <= chanceToBet) {
          const betsPerSecondRaw = Number(gravityBotConfig?.betsPerSecond ?? 1);
          const base = Math.floor(betsPerSecondRaw);
          const extra = betsPerSecondRaw - base;
          const attempts = Math.max(0, base) + (Math.random() < extra ? 1 : 0);

          const minBet = Math.max(0.1, Number(gravityBotConfig?.minBet ?? 0.1));
          const maxBet = Math.max(minBet, Number(gravityBotConfig?.maxBet ?? 5));
          const upRatio = Number(gravityBotConfig?.upRatio ?? 0.5);
          const downRatio = Number(gravityBotConfig?.downRatio ?? 0.5);
          const dirPick = upRatio / ((upRatio + downRatio) || 1);

          for (let k = 0; k < attempts; k += 1) {
            const botUserId = sampleBotUserId();
            if (!botUserId) continue;

            const botUser = await User.findOne({ userId: botUserId });
            if (!botUser) continue;

            const direction = Math.random() < dirPick ? "up" : "down";

            const affordableMax = Math.min(maxBet, Number(botUser.balance ?? 0));
            if (affordableMax < minBet) continue;

            const betAmount = round2(randomBetween(minBet, affordableMax));
            if (!Number.isFinite(betAmount) || betAmount < 0.1) continue;

            try {
              const { row, round } = await placeGravityBet({ user: botUser, amount: betAmount, direction });
              await publishGravityBetEvent(ably, row, round);
            } catch {
              // ignore duplicate-side bets or insufficient balance
            }
          }
        }
      }

      // Settlement is scheduled exactly at the viewing->result boundary (setTimeout above),
      // but keep a safety fallback if something goes wrong.
      if (elapsedMs >= BETTING_MS + VIEWING_MS + 1200 && !settled) {
        await settleRound(ably);
      }

      if (elapsedMs >= ROUND_MS) {
        // Avoid closing while settlement is still saving the same GravityRound doc.
        if (settlePromise && settlingRoundId === roundAtTick.roundId) {
          await settlePromise;
        }
        // Another tick could have rolled the round; only close if it's still the same doc.
        if (!currentRound || String(currentRound._id) !== String(roundAtTick._id)) {
          return;
        }
        currentRound.phase = "closed";
        await currentRound.save();
        currentRound = await createRound();
        scheduleRoundTimers(currentRound);
        await publish(ably, EVENT_STATE, await getGravityStateSnapshot());
      }
    } catch (err) {
      console.error("[gravityGame] loop error:", err);
    } finally {
      loopInFlight = false;
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
