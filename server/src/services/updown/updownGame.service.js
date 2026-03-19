import UpDownRound from "../../models/UpDownRound.js";
import UpDownGameState from "../../models/UpDownGameState.js";
import UpDownRoundCounter from "../../models/UpDownRoundCounter.js";
import UpDownBet from "../../models/UpDownBet.js";
import User from "../../models/User.js";
import GravityBot from "../../models/GravityBot.js";
import { processUpDownResult } from "./updownResult.service.js";
import cron from "node-cron";

const PREVIEW_SECONDS = 5;
const BETTING_SECONDS = 10;

const TRADING_SECONDS = 5;
const RESULT_SECONDS = 3;
const INITIAL_VALUE = 100;
/** Graph flowing speed: 0.1 s per point for betting so stored time is not 0.2s */
const GRAPH_FLOW_STEP_SEC = 0.1;
const GRAPH_UPDATE_MS = GRAPH_FLOW_STEP_SEC * 1000;
/** Place-bets graph: 101 points at 0.1s step (0, 0.1, 0.2, … 10); trading adds 25 points = 126 total in DB */
const BETTING_GRAPH_POINTS = 151;
const LIVE_FEED_INTERVAL_MS = GRAPH_UPDATE_MS;
const CHART_WINDOW_SECONDS = 10;
/** Publish live-point to Ably at most this often to stay under message limits (free tier) */
const ABLY_LIVE_POINT_INTERVAL_MS = 500;
/** Max points to keep in DB for 10s window at 0.1s step */
const MAX_LIVE_GRAPH_POINTS = Math.ceil(CHART_WINDOW_SECONDS / GRAPH_FLOW_STEP_SEC) + 5;

/** Step size for graph: small so path fluctuates smoothly (market-like) */
const STEP_MAGNITUDE = 0.35;
/** Pull value back toward start (mean-reversion) so path doesn't drift away */
const MEAN_REVERSION = 0.025;

/**
 * Small, symmetric random step for smooth market-like fluctuation.
 * Range approx [-STEP_MAGNITUDE, STEP_MAGNITUDE].
 */
function randomStep() {
  return (Math.random() - 0.5) * 2 * STEP_MAGNITUDE;
}

/**
 * Market-like step: small random change + mean-reversion toward startValue.
 * Produces continuous up/down movement that tends to oscillate around start.
 */
function marketStep(startValue, currentValue) {
  const noise = randomStep();
  const reversion = MEAN_REVERSION * (startValue - currentValue);
  return noise + reversion;
}

/**
 * Slight drift per step for result-biased graph (so path ends on correct side).
 * Kept small so the path still fluctuates visibly; final nudge only if needed.
 */
function resultDriftPerStep(wantDown) {
  return wantDown ? -0.02 : 0.02;
}

let liveFeedValue = null;
let liveFeedTime = null;
let liveFeedInited = false;
let liveFeedIntervalId = null;
let liveFeedStartValue = null;
let liveFeedPoints = [];
let serverGraphTime = 0;
let currentRoundGraphTimeStart = null;
let lastLiveFeedPhase = null;
/** Last 10s of graph points (server time) so refreshed clients get same window as everyone else */
let graphBuffer60 = [];
let lastAblyLivePointAt = 0;
/** When the current flow cycle (preview→betting→countdown) started; same for everyone so refresh shows same graph */
let flowCycleStartTime = null;

let previewBotCron = null;


function generateGraph(startValue, durationSeconds = TRADING_SECONDS) {
  const points = [];
  const stepMs = GRAPH_UPDATE_MS;
  const totalSteps = (durationSeconds * 1000) / stepMs;
  let value = startValue;
  for (let i = 0; i <= totalSteps; i++) {
    const t = (i * stepMs) / 1000;
    value += marketStep(startValue, value);
    points.push({ time: t, value });
  }
  return points;
}

function generateGraphBetting(startValue, durationSeconds = 15) {
  const points = [];
  const totalSteps = BETTING_GRAPH_POINTS - 1;
  const stepMs = (durationSeconds * 1000) / totalSteps;
  let value = startValue;
  for (let i = 0; i <= totalSteps; i++) {
    const t = (i * stepMs) / 1000;
    value += marketStep(startValue, value);
    points.push({ time: t, value });
  }
  return points;
}

/**
 * Generate graph points so the last value matches the result: down => last < threshold, up => last > threshold.
 * Path starts at initialValue (e.g. end of place-bets phase) and fluctuates; threshold is used only for the result check.
 * @param {number} initialValue - First point value (e.g. last value from place-bets graph).
 * @param {string} result - "up" | "down" (required end side relative to threshold).
 * @param {number} durationSeconds - Duration in seconds.
 * @param {number} [threshold] - Value to compare for result; if omitted, uses initialValue.
 */
function generateGraphWithResult(initialValue, result, durationSeconds = TRADING_SECONDS, threshold) {
  const thresholdValue = threshold !== undefined && threshold !== null ? threshold : initialValue;
  const points = [];
  const stepMs = GRAPH_UPDATE_MS;
  const totalSteps = (durationSeconds * 1000) / stepMs;
  const wantDown = result === "down";
  const drift = resultDriftPerStep(wantDown);
  let value = initialValue;
  for (let i = 0; i <= totalSteps; i++) {
    const t = (i * stepMs) / 1000;
    value += marketStep(initialValue, value) + drift;
    points.push({ time: t, value });
  }
  const last = points[points.length - 1];
  const margin = 0.4 + Math.random() * 0.3;
  if (wantDown && last.value >= thresholdValue) {
    last.value = thresholdValue - margin;
  } else if (!wantDown && last.value <= thresholdValue) {
    last.value = thresholdValue + margin;
  }
  return points;
}

let gameStateDoc = null;

function getHumanBet(min, max) {
  const r = Math.random();
  if (r < 0.6) return min + Math.floor(Math.random() * 5);        // small bets
  if (r < 0.9) return min + 5 + Math.floor(Math.random() * 10);  // medium
  return max;                                                    // whale 🐳
}

function pickDirectionSmart(botBets, totalBots, upRatio) {
  const upCount = botBets.filter(b => b.direction === "up").length;
  const downCount = botBets.filter(b => b.direction === "down").length;

  const remaining = totalBots - (upCount + downCount);
  if (remaining <= 0) return null;

  const remainingUp =
    Math.max(Math.floor(totalBots * upRatio) - upCount, 0);

  // weight randomness by remaining slots
  const r = Math.random() * remaining;

  return r < remainingUp ? "up" : "down";
}

/**
 * START PREVIEW BOT
 */
export function startPreviewBotCron(ably, roundId) {
  if (previewBotCron) return;

  
  previewBotCron = cron.schedule(
    "* * * * * *", // every second
    async () => {
      try {
        const BOT_CONTROL = await GravityBot.findOne();
        if (!BOT_CONTROL.enabled) return;

        const botUsers = await User.find({ partnerLevel: 0 });
        if (!botUsers.length) return;

        const round = await UpDownBet.findOne({ roundId });
        if (!round) return;

        const botBets = round.user.filter(u => u.isUser === 0);

        if (botBets.length >= BOT_CONTROL.totalBots) return;


        for (let i = 0; i < BOT_CONTROL.betsPerSecond; i++) {
          if (botBets.length >= BOT_CONTROL.totalBots) break;
          if (Math.random() > BOT_CONTROL.chanceToBet) continue;
        
          const direction = pickDirectionSmart(
            botBets,
            BOT_CONTROL.totalBots,
            BOT_CONTROL.upRatio
          );
        
          if (!direction) break;
        
          const bot = botUsers[Math.floor(Math.random() * botUsers.length)];
          const betAmount = getHumanBet(
            BOT_CONTROL.minBet,
            BOT_CONTROL.maxBet
          );
        
          await UpDownBet.updateOne(
            { roundId },
            {
              $push: {
                user: {
                  userId: bot.userId,
                  altas: bot.altas,
                  avatar: bot.avatar,
                  direction,
                  amount: betAmount,
                  isUser: 0,
                },
              },
            }
          );
        
          botBets.push({ direction }); // keep local count in sync
        
          if (ably) {
            const channel = ably.channels.get("Gravity");
            await channel.publish("bet-placed", {
              bet: {
                roundId,
                userId: bot.userId,
                userName: bot.altas,
                avatar: bot.avatar || null,
                direction,
                amount: betAmount,
              },
              timestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        console.error("❌ Preview bot error:", err);
      }
    },
    { scheduled: true }
  );

  // console.log("🤖 Preview bot cron STARTED");
}

/**
 * STOP BOT (important when round ends)
 */
export function stopPreviewBotCron() {
  if (previewBotCron) {
    previewBotCron.stop();
    previewBotCron = null;
    // console.log("🛑 Preview bot cron STOPPED");
  }
}

async function getOrCreateGameState() {
  // console.log("gameStateDoc===========================>", gameStateDoc);
  if (gameStateDoc) return gameStateDoc;
  let state = await UpDownGameState.findOne().lean();
  // console.log(state.currentRoundId);
  if (!state) {
    await UpDownGameState.create({
      phase: "preview",
      phaseEndAt: new Date(Date.now() + PREVIEW_SECONDS * 1000),
      currentRoundId: null,
    });
    state = await UpDownGameState.findOne().lean();
  }
  gameStateDoc = state;
  return state;
}

export async function advancePhase(ably) {
  const state = await UpDownGameState.findOne();
  if (!state) return;
  const now = new Date();
  if (state.phaseEndAt > now) return;

  const phases = ["preview", "betting", "trading", "result"];
  const durations = {
    preview: PREVIEW_SECONDS,
    betting: BETTING_SECONDS,
    trading: TRADING_SECONDS,
    result: RESULT_SECONDS,
  };

  if (state.phase === "preview") {
    // Create round when transitioning from preview to betting
    const counter = await UpDownRoundCounter.findByIdAndUpdate(
      "round",
      { $inc: { nextId: 1 } },
      { new: true, upsert: true }
    ).lean();
    const roundId = counter.nextId;
    await UpDownRound.create({
      roundId,
    });
    await UpDownBet.create({
      roundId: roundId,
      user: [],
      amount: 0,
      status: "pending",
    });
    // Insert graph data in DB during place-bets phase (not shown on frontend until trading)
    const startValue = INITIAL_VALUE + (Math.random() - 0.5) * 10;
    const graphData = generateGraphBetting(startValue);
    const endValue = graphData[graphData.length - 1].value;
    await UpDownRound.findOneAndUpdate(
      { roundId },
      { $set: { startValue, graphData, endValue } }
    );
    state.currentRoundId = roundId;
    startPreviewBotCron(ably, roundId);
    state.phase = "betting";
    state.phaseEndAt = new Date(now.getTime() + BETTING_SECONDS * 1000);
  } else if (state.phase === "betting") {
    stopPreviewBotCron();
    // Create the whole graph data before trading so we have full data before we show the graph
    if (state.currentRoundId) {
      try {
        const betDoc = await UpDownBet.findOne({ roundId: state.currentRoundId }).lean();
        if (betDoc && betDoc.user && betDoc.user.length > 0) {
          const upTotal = betDoc.user
            .filter((u) => u.direction === "up" && u.isUser === 1)
            .reduce((sum, u) => sum + u.amount, 0);
          const downTotal = betDoc.user
            .filter((u) => u.direction === "down" && u.isUser === 1)
            .reduce((sum, u) => sum + u.amount, 0);

          const resultInfo = await processUpDownResult(state.currentRoundId, upTotal, downTotal);
          const winners = resultInfo.winners;
          const losers = resultInfo.losers;
          const winnerSide = resultInfo.winnerSide;
          const loserSide = resultInfo.loserSide;
          const roundId = resultInfo.roundId;

          // Append trading phase to place-bets graph so the round has one continuous series (no reset)
          const round = await UpDownRound.findOne({ roundId: state.currentRoundId }).lean();
          if (round && winnerSide) {
            const roundStartValue = round.startValue ?? INITIAL_VALUE + (Math.random() - 0.5) * 10;
            const graphData = round.graphData;
            if(winnerSide === "down") {
              graphData[150].value = graphData[100].value - Math.random();
            }
            else if(winnerSide === "up") {
              graphData[150].value = graphData[100].value + Math.random();
            }
            // const bettingGraphData = round.graphData && Array.isArray(round.graphData) ? round.graphData : [];
            // const expectedBettingPoints = BETTING_GRAPH_POINTS;
            // const alreadyCombined = bettingGraphData.length > expectedBettingPoints;
            // let graphData;
            // if (alreadyCombined) {
            //   graphData = bettingGraphData;
            // } else {
            //   const tradingStartValue = bettingGraphData.length > 0
            //     ? bettingGraphData[bettingGraphData.length - 1].value
            //     : roundStartValue;
            //   const tradingPoints = generateGraphWithResult(tradingStartValue, winnerSide, TRADING_SECONDS, roundStartValue);
            //   const timeOffset = BETTING_SECONDS;
            //   const tradingWithOffset = tradingPoints.map((p) => ({ time: p.time + timeOffset, value: p.value }));
            //   // Skip first trading point (time=10) to avoid duplicate with last betting point
            //   graphData = [...bettingGraphData, ...tradingWithOffset.slice(1)];
            // }
            const startValue = graphData[100].value;
            const endValue = graphData[graphData.length - 1].value;
            const result = winnerSide;
            await UpDownRound.findOneAndUpdate(
              { roundId: state.currentRoundId },
              { $set: { endValue, graphData, result, startValue, endValue } }
            );
          }

          if (winners) {
            for (const winner of winners) {
              const user = await User.findOne({ userId: winner.userId }).lean();
              if (user) {
                const updownHistory = user.updownHistory || [];
                updownHistory.push({
                  roundId,
                  direction: winnerSide,
                  amount: winner.amount,
                  result: "win",
                  profit: winner.profit,
                  createdAt: new Date(),
                });
                await User.updateOne(
                  { userId: winner.userId },
                  { $set: { updownHistory } }
                );
              }
            }
          }
          if (losers) {
            for (const loser of losers) {
              const user = await User.findOne({ userId: loser.userId }).lean();
              if (user) {
                const updownHistory = user.updownHistory || [];
                updownHistory.push({
                  roundId,
                  direction: loserSide,
                  amount: loser.amount,
                  result: "lose",
                  profit: loser.profit,
                  createdAt: new Date(),
                });
                await User.updateOne(
                  { userId: loser.userId },
                  { $set: { updownHistory } }
                );
              }
            }
          }

          try {
            if (typeof ably !== "undefined" && ably) {
              const channel = ably.channels.get("Gravity");
              channel.publish("updown:round-result", { roundId: state.currentRoundId, result: resultInfo }).catch((err) => {
                console.error("Failed to publish updown:round-result:", err);
              });
            }
          } catch (pubErr) {
            console.error("Error publishing round-result:", pubErr);
          }
        }
      } catch (err) {
        console.error("[UpDown] Error processing round result:", err);
      }
    }
    state.phase = "trading";
    state.phaseEndAt = new Date(now.getTime() + TRADING_SECONDS * 1000);

  } else if (state.phase === "trading") {
    // Process result when entering result phase so round has correct outcome (bigger side loses) from the start
    
    state.phase = "result";
    state.phaseEndAt = new Date(now.getTime() + RESULT_SECONDS * 1000);
  } else if (state.phase === "result") {
    // Transition to preview. Keep currentRoundId for one state-publish cycle
    // so clients receive the updated round result before it's cleared.
    state.phase = "preview";
    state.phaseEndAt = new Date(now.getTime() + PREVIEW_SECONDS * 1000);
    // Schedule clearing the currentRoundId after a short delay (slightly more than STATE_PUBLISH_MS)
    setTimeout(async () => {
      try {
        const s = await UpDownGameState.findOne();
        if (s && s.currentRoundId) {
          s.currentRoundId = null;
          await s.save();
          gameStateDoc = s.toObject ? s.toObject() : s;
        }
      } catch (err) {
        console.error("Error clearing currentRoundId:", err);
      }
    }, 1100);
  } else {
    // console.log("4=================================>");
    const nextIndex = phases.indexOf(state.phase) + 1;
    state.phase = phases[nextIndex];
    state.phaseEndAt = new Date(now.getTime() + durations[state.phase] * 1000);
  }
  await state.save();
  gameStateDoc = state.toObject ? state.toObject() : state;
}

export async function getCurrentState() {
  await getOrCreateGameState();
  const now = new Date();
  let updated = await UpDownGameState.findOne();
  while (updated && updated.phaseEndAt <= now) {
    // await advancePhase();
    updated = await UpDownGameState.findOne();
  }
  const state = updated ? updated.toObject ? updated.toObject() : updated : await UpDownGameState.findOne().lean();
  if (!state) return { phase: "preview", phaseEndAt: new Date(Date.now() + PREVIEW_SECONDS * 1000), round: null };

  let round = null;
  if (state.currentRoundId) {
    round = await UpDownRound.findOne({ roundId: state.currentRoundId })
      .select("roundId result startValue endValue graphData createdAt winnerSide loserSide upTotalBet downTotalBet")
      .lean();
  }

  return {
    phase: state.phase,
    phaseEndAt: state.phaseEndAt,
    round,
  };
}

export async function startUpDownGameLoop(ably) {
  await getOrCreateGameState();
  const existing = await UpDownRoundCounter.findById("round").lean();
  if (!existing) {
    const last = await UpDownRound.findOne().sort({ roundId: -1 }).select("roundId").lean();
    await UpDownRoundCounter.create({ _id: "round", nextId: (last?.roundId ?? 0) + 1 });
  }
  setInterval(async () => {
    try {
      await advancePhase(ably);
    } catch (err) {
      console.error("UpDown game loop error:", err);
    }
  }, 500);
}

export function startUpDownLiveFeed(ably) {
  if (!ably) return;
  if (liveFeedIntervalId) {
    clearInterval(liveFeedIntervalId);
    liveFeedIntervalId = null;
  }
  const channel = ably.channels.get("Gravity");
  liveFeedIntervalId = setInterval(async () => {
    try {
      const state = await getCurrentState();
      const phase = state.phase;
      if (phase === "trading" || phase === "result") {
        if (phase === "trading" && lastLiveFeedPhase === "betting") {
          currentRoundGraphTimeStart = serverGraphTime;
          serverGraphTime += TRADING_SECONDS;
          // During trading, persist the round's graphData as liveGraphPoints (normalized to 101 points)
          if (state.round && state.round.graphData && state.round.graphData.length > 0) {
            // Map the trading graph to liveGraphPoints with the same normalization
            graphBuffer60 = state.round.graphData.map((p) => ({ time: p.time, value: p.value }));
          }
        }
        flowCycleStartTime = null;
        lastLiveFeedPhase = phase;
        liveFeedInited = false;
        liveFeedValue = null;
        liveFeedTime = null;
        liveFeedStartValue = null;
        liveFeedPoints = [];
        return;
      }
      if (phase === "preview" || phase === "betting") {
        if (!liveFeedInited) {
          flowCycleStartTime = serverGraphTime;
          liveFeedValue = INITIAL_VALUE + (Math.random() - 0.5) * 10;
          liveFeedTime = 0;
          liveFeedStartValue = liveFeedValue;
          liveFeedPoints = [];
          liveFeedInited = true;
        }
        liveFeedPoints.push({ time: serverGraphTime, value: liveFeedValue });
        graphBuffer60.push({ time: serverGraphTime, value: liveFeedValue });
        graphBuffer60 = graphBuffer60.filter((p) => p.time >= serverGraphTime - CHART_WINDOW_SECONDS);
        graphBuffer60.sort((a, b) => a.time - b.time);
        const now = Date.now();
        liveFeedValue += marketStep(liveFeedStartValue, liveFeedValue);
        liveFeedTime += LIVE_FEED_INTERVAL_MS / 1000;
        serverGraphTime += LIVE_FEED_INTERVAL_MS / 1000;
        lastLiveFeedPhase = phase;
      }
    } catch (err) {
      console.error("UpDown live feed error:", err);
    }
  }, LIVE_FEED_INTERVAL_MS);

  const STATE_PUBLISH_MS = 1000;
  setInterval(async () => {
    try {
      const state = await getCurrentState();
      const serverTime = Date.now();
      const phaseEndAt = state.phaseEndAt;
      const phaseEndMs = phaseEndAt && typeof phaseEndAt.getTime === "function" ? phaseEndAt.getTime() : (phaseEndAt ? new Date(phaseEndAt).getTime() : 0);
      const remainingMs = Math.max(0, phaseEndMs - serverTime);
      let graphDisplaySec = null;
      if (state.phase === "betting") {
        const elapsedMs = Math.max(0, BETTING_SECONDS * 1000 - remainingMs);
        graphDisplaySec = Math.min(BETTING_SECONDS, elapsedMs / 1000);
      } else if (state.phase === "trading") {
        const elapsedMs = Math.max(0, TRADING_SECONDS * 1000 - remainingMs);
        graphDisplaySec = Math.min(TRADING_SECONDS, elapsedMs / 1000);
      }
      const payload = {
        phase: state.phase,
        phaseEndAt: phaseEndAt ? (phaseEndAt.toISOString ? phaseEndAt.toISOString() : phaseEndAt) : null,
        round: state.round,
        serverTime,
        graphTimeStart: state.phase === "trading" || state.phase === "result" ? currentRoundGraphTimeStart : null,
        ...(graphDisplaySec != null && { graphDisplaySec }),
      };
      channel.publish("updown:state", payload).catch((err) => {
        console.error("UpDown Ably publish state error:", err);
      });
    } catch (err) {
      console.error("UpDown state publish error:", err);
    }
  }, STATE_PUBLISH_MS);

}

async function clearLiveGraphFromDB() {
  try {
    await UpDownGameState.updateOne(
      {},
      { $set: { liveGraphPoints: [], flowCycleStartTime: null, liveGraphStartValue: null } }
    );
  } catch (err) {
    console.error("UpDown clearLiveGraphFromDB error:", err);
  }
}

/** Load live graph from DB into memory so refreshed clients (or restarted server) get same graph */
export async function ensureLiveGraphFromDB() {
  try {
    if (graphBuffer60.length > 0) return;
    const state = await UpDownGameState.findOne()
      .select("phase liveGraphPoints flowCycleStartTime liveGraphStartValue")
      .lean();
    if (!state) return;
    const { phase, liveGraphPoints, flowCycleStartTime: dbCycleStart, liveGraphStartValue: dbStartValue } = state;
    if (phase !== "preview" && phase !== "betting" && phase !== "trading") return;
    if (!Array.isArray(liveGraphPoints) || liveGraphPoints.length === 0) return;
    const points = liveGraphPoints.map((p) => ({ time: p.time, value: p.value }));
    graphBuffer60.length = 0;
    graphBuffer60.push(...points);
    if (typeof dbCycleStart === "number") flowCycleStartTime = dbCycleStart;
    if (typeof dbStartValue === "number") liveFeedStartValue = dbStartValue;
    liveFeedPoints.length = 0;
    liveFeedPoints.push(...points);
    liveFeedInited = true;
    const last = points[points.length - 1];
    if (last && typeof last.time === "number") {
      serverGraphTime = Math.max(serverGraphTime, last.time + GRAPH_FLOW_STEP_SEC);
      liveFeedValue = last.value;
      liveFeedTime = serverGraphTime - (flowCycleStartTime ?? serverGraphTime);
    }
  } catch (err) {
    console.error("UpDown ensureLiveGraphFromDB error:", err);
  }
}

export function getLiveStateSync() {
  // Always return exactly 101 points from the database for consistency across refreshes
  // This ensures all clients see the same graph regardless of when they refresh
  if (graphBuffer60.length === 0) {
    // In-memory buffer is empty, check if we should fill with defaults
    const startValue = liveFeedStartValue ?? INITIAL_VALUE;
    const points = liveFeedPoints.length > 0
      ? liveFeedPoints.map((p) => ({ time: p.time, value: p.value }))
      : [];
    
    // If still empty, return empty (DB will be loaded on next request via ensureLiveGraphFromDB)
    return {
      startValue,
      points,
      windowSeconds: CHART_WINDOW_SECONDS,
      flowCycleStartTime: flowCycleStartTime ?? null,
    };
  }
  
  // graphBuffer60 has data - this came from DB via ensureLiveGraphFromDB and is already normalized to 101 points
  const points = graphBuffer60.map((p) => ({ time: p.time, value: p.value }));
  const startValue = liveFeedStartValue ?? graphBuffer60[0]?.value ?? INITIAL_VALUE;
  
  return {
    startValue,
    points, // Will always be 101 points since persistLiveGraphToDB normalizes to exactly 101
    windowSeconds: CHART_WINDOW_SECONDS,
    flowCycleStartTime: flowCycleStartTime ?? null,
  };
}

export function getGraphTimeStart() {
  return currentRoundGraphTimeStart;
}

let ablyClient = null;

export function setAblyClient(client) {
  ablyClient = client;
}

export async function publishBetToAbly(bet) {
  try {
    // console.log("bet========================>", bet);
    if (!ablyClient) {
      console.warn("Ably client not initialized for bet publishing");
      return;
    }

    console.log("bet========================>", bet);
    
    const channel = ablyClient.channels.get("Gravity");
    await channel.publish("bet-placed", {
      bet: {
        roundId: bet.roundId,
        userId: bet.userId,
        userName: bet.userName,
        avatar: bet.avatar || null,
        direction: bet.direction,
        amount: bet.amount,
        createdAt: bet.createdAt,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("UpDown publishBetToAbly error:", err);
  }
}