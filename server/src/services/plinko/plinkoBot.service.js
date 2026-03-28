import User from "../../models/User.js";
import PlinkoResult from "../../models/plinko/PlinkoResult.js";
import { getPlinkoMultipliers, pickWeightedSlot } from "./plinkoMultipliers.js";
import { rollPlinkoSlotFromConfig, weightsFromMultiplierBands } from "./plinkoRates.service.js";
import { getPlinkoBotSettingsResolved } from "./plinkoBotSettings.service.js";

const PLINKO_RISK = "regular";
const ROW_MIN = 8;
const ROW_MAX = 16;
const MIN_BET = 0.5;
const MAX_BET = 20;

const BET_TIERS = [
  { min: 0.5, max: 2, p: 0.35 },
  { min: 2, max: 10, p: 0.4 },
  { min: 10, max: 20, p: 0.25 },
];

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function randomBet() {
  const r = Math.random();
  let acc = 0;
  for (const t of BET_TIERS) {
    acc += t.p;
    if (r < acc) {
      return round2(t.min + Math.random() * (t.max - t.min));
    }
  }
  return round2(MIN_BET);
}

function randomRows() {
  return ROW_MIN + Math.floor(Math.random() * (ROW_MAX - ROW_MIN + 1));
}

function pickBot(users) {
  return users[Math.floor(Math.random() * users.length)];
}

/** Slot indices where payout is strictly greater than bet (visible “win”). */
function pickWinSlot(multipliers, betAmount) {
  const idx = [];
  for (let i = 0; i < multipliers.length; i += 1) {
    if (round2(betAmount * multipliers[i]) > betAmount) idx.push(i);
  }
  if (idx.length === 0) return null;
  return idx[Math.floor(Math.random() * idx.length)];
}

/** Slot indices where payout ≤ bet (loss or push). */
function pickLoseSlot(multipliers, betAmount) {
  const idx = [];
  for (let i = 0; i < multipliers.length; i += 1) {
    if (round2(betAmount * multipliers[i]) <= betAmount) idx.push(i);
  }
  if (idx.length === 0) return null;
  return idx[Math.floor(Math.random() * idx.length)];
}

async function trimBotRows(maxKeep = 300) {
  const recent = await PlinkoResult.find({ isBot: true })
    .sort({ createdAt: -1 })
    .limit(maxKeep)
    .select("_id")
    .lean();
  const ids = recent.map((d) => d._id);
  if (ids.length === 0) return;
  await PlinkoResult.deleteMany({ isBot: true, _id: { $nin: ids } });
}

async function runOneBotRound(ably, botPool) {
  const settings = await getPlinkoBotSettingsResolved();
  const { winRate, loseRate, botMultiplierBands } = settings;

  const pick = pickBot(botPool);
  const user = await User.findOne({ userId: pick.userId }).select("userId altas avatar").lean();
  if (!user) return;

  const betAmount = randomBet();
  let rows = randomRows();
  let multipliers = getPlinkoMultipliers(rows, PLINKO_RISK);
  let slot;

  /** DB `botMultiplierBands`: landing weights by multiplier range (ignores win/lose for this round). */
  if (botMultiplierBands && botMultiplierBands.length > 0) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const w = weightsFromMultiplierBands(multipliers, botMultiplierBands);
      if (w && w.length === multipliers.length) {
        const sum = w.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          slot = pickWeightedSlot(w);
          break;
        }
      }
      rows = randomRows();
      multipliers = getPlinkoMultipliers(rows, PLINKO_RISK);
    }
    if (slot == null) {
      slot = await rollPlinkoSlotFromConfig(rows);
    }
  } else {
    const u = Math.random();
    let mode = "natural";
    if (u < winRate) mode = "win";
    else if (u < winRate + loseRate) mode = "lose";

    if (mode === "win") {
      slot = pickWinSlot(multipliers, betAmount);
      for (let t = 0; t < 16 && slot == null; t += 1) {
        rows = randomRows();
        multipliers = getPlinkoMultipliers(rows, PLINKO_RISK);
        slot = pickWinSlot(multipliers, betAmount);
      }
      if (slot == null) {
        slot = await rollPlinkoSlotFromConfig(rows);
      }
    } else if (mode === "lose") {
      slot = pickLoseSlot(multipliers, betAmount);
      for (let t = 0; t < 16 && slot == null; t += 1) {
        rows = randomRows();
        multipliers = getPlinkoMultipliers(rows, PLINKO_RISK);
        slot = pickLoseSlot(multipliers, betAmount);
      }
      if (slot == null) {
        slot = await rollPlinkoSlotFromConfig(rows);
      }
    } else {
      slot = await rollPlinkoSlotFromConfig(rows);
    }
  }

  const mult = round2(Number(multipliers[slot]));
  const win = round2(betAmount * mult);
  const profit = round2(win - betAmount);

  const doc = await PlinkoResult.create({
    userId: String(user.userId ?? ""),
    userName: user.altas || "Player",
    avatar: user.avatar || "",
    betAmount,
    multiplier: mult,
    win,
    profit,
    rows,
    isBot: true,
  });

  await trimBotRows(300);

  if (ably) {
    const channel = ably.channels.get("plinkoLive");
    await channel.publish("PLINKO_LIVE_ROW", {
      id: doc._id.toString(),
      userId: doc.userId,
      user: doc.userName,
      avatar: doc.avatar,
      betAmount,
      multiplier: doc.multiplier,
      win: doc.win,
      profit: doc.profit,
    });
  }
}

/**
 * Writes bot rounds to `PlinkoResult` (live feed). Timing and win/lose mix come from `PlinkoBotSettings` in MongoDB.
 */
export async function plinkoBot(ably) {
  const botPool = await User.find({ partnerLevel: 0 }).select("userId").lean();
  if (!botPool?.length) {
    console.warn("[plinkoBot] No partnerLevel:0 users — bot feed disabled");
    return;
  }

  const scheduleNext = async () => {
    try {
      const { botRunIntervalMs } = await getPlinkoBotSettingsResolved();
      await runOneBotRound(ably, botPool);
      setTimeout(scheduleNext, botRunIntervalMs);
    } catch (err) {
      console.error("[plinkoBot]", err?.message || err);
      setTimeout(scheduleNext, 5000);
    }
  };

  scheduleNext();
}
