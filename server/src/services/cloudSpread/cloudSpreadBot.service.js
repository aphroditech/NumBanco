import cron from "node-cron";
import User from "../../models/User.js";
import CloudSpreadHistory from "../../models/CloudSpreadHistory.js";
import CloudSpreadSettings from "../../models/CloudSpreadSettings.js";
import { publishCloudSpreadLiveRow } from "./cloudSpreadGame.service.js";

/** Used only if DB has no document or bad data (see `initCloudSpreadSetting`). */
const FALLBACK = {
  botWinProbability: 0.8,
  botTriggerProbability: 0.28,
  maxBotRows: 400,
  betAmountTiers: [
    { min: 0.1, max: 2, probability: 0.28 },
    { min: 2, max: 8, probability: 0.28 },
    { min: 8, max: 16, probability: 0.24 },
    { min: 16, max: 28, probability: 0.2 },
  ],
  winProductMin: 0.4,
  winProductMax: 6.9,
  targetStepMin: 1,
  targetStepMax: 8,
  roundIdMin: 1000,
  roundIdMax: 9_999_999,
};

function round2(v) {
  return Math.round(Number(v) * 100) / 100;
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function randomInt(min, max) {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function multiplierForStep(step) {
  return 2 ** Number(step);
}

function normalizeTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return FALLBACK.betAmountTiers;
  const out = tiers.filter(
    (t) =>
      t &&
      Number.isFinite(Number(t.min)) &&
      Number.isFinite(Number(t.max)) &&
      Number.isFinite(Number(t.probability)) &&
      Number(t.probability) > 0
  );
  return out.length ? out : FALLBACK.betAmountTiers;
}

function randomBetAmount(tiers) {
  const list = normalizeTiers(tiers);
  const r = Math.random();
  let acc = 0;
  let range = list[0];
  for (const tier of list) {
    acc += Number(tier.probability);
    if (r < acc) {
      range = tier;
      break;
    }
  }
  const lo = Number(range.min);
  const hi = Number(range.max);
  const amount = lo + Math.random() * (hi - lo);
  return round2(amount);
}

async function resolveSettings() {
  const doc = await CloudSpreadSettings.findOne().lean();
  if (!doc) return { ...FALLBACK, betAmountTiers: [...FALLBACK.betAmountTiers] };

  const tMin = Math.min(Number(doc.targetStepMin ?? 1), Number(doc.targetStepMax ?? 8));
  const tMax = Math.max(Number(doc.targetStepMin ?? 1), Number(doc.targetStepMax ?? 8));
  const rMin = Math.min(Number(doc.roundIdMin ?? 1000), Number(doc.roundIdMax ?? 9_999_999));
  const rMax = Math.max(Number(doc.roundIdMin ?? 1000), Number(doc.roundIdMax ?? 9_999_999));
  let wMin = Number(doc.winProductMin ?? FALLBACK.winProductMin);
  let wMax = Number(doc.winProductMax ?? FALLBACK.winProductMax);
  if (!Number.isFinite(wMin)) wMin = FALLBACK.winProductMin;
  if (!Number.isFinite(wMax)) wMax = FALLBACK.winProductMax;
  if (wMax < wMin) [wMin, wMax] = [wMax, wMin];

  return {
    botWinProbability: clamp01(doc.botWinProbability ?? FALLBACK.botWinProbability),
    botTriggerProbability: clamp01(doc.botTriggerProbability ?? FALLBACK.botTriggerProbability),
    maxBotRows: Math.max(1, Math.floor(Number(doc.maxBotRows) || FALLBACK.maxBotRows)),
    betAmountTiers: normalizeTiers(doc.betAmountTiers),
    winProductMin: wMin,
    winProductMax: wMax,
    targetStepMin: Math.max(1, Math.min(8, Math.floor(tMin) || 1)),
    targetStepMax: Math.max(1, Math.min(8, Math.floor(tMax) || 8)),
    roundIdMin: rMin,
    roundIdMax: rMax,
  };
}

async function trimOldBotRows(maxRows) {
  const cap = Math.max(1, Math.floor(Number(maxRows) || FALLBACK.maxBotRows));
  const count = await CloudSpreadHistory.countDocuments({ isBot: true });
  if (count <= cap) return;
  const excess = count - cap;
  const oldest = await CloudSpreadHistory.find({ isBot: true })
    .sort({ createdAt: 1 })
    .limit(excess)
    .select("_id")
    .lean();
  const ids = oldest.map((d) => d._id);
  if (ids.length) await CloudSpreadHistory.deleteMany({ _id: { $in: ids } });
}

/**
 * Inserts occasional CloudSpreadHistory rows from `partnerLevel: 0` users.
 * Tunables: `CloudSpreadSettings` in MongoDB (see `initCloudSpreadSetting`).
 * Live feed: Ably `cloudSpreadLive` / `CLOUD_SPREAD_HISTORY`.
 */
export async function cloudSpreadBot() {
  const botUsers = await User.find({ partnerLevel: 0 }).select("userId").lean();
  if (!botUsers?.length) {
    console.warn("[cloudSpreadBot] No partnerLevel:0 users — skipping bot feed");
    return;
  }

  cron.schedule("* * * * * *", async () => {
    let settings;
    try {
      settings = await resolveSettings();
    } catch (err) {
      console.error("[cloudSpreadBot] settings load failed:", err?.message || err);
      return;
    }

    if (Math.random() >= settings.botTriggerProbability) return;
    try {
      const pick = botUsers[Math.floor(Math.random() * botUsers.length)];
      const user = await User.findOne({ userId: pick.userId });
      if (!user) return;

      const stake = randomBetAmount(settings.betAmountTiers);
      const targetStep = randomInt(settings.targetStepMin, settings.targetStepMax);
      const targetMultiplier = multiplierForStep(targetStep);
      const isWin = Math.random() < settings.botWinProbability;
      let winAmount = 0;
      if (isWin) {
        const span = settings.winProductMax - settings.winProductMin;
        const cloudProduct = settings.winProductMin + Math.random() * (Number.isFinite(span) && span > 0 ? span : FALLBACK.winProductMax - FALLBACK.winProductMin);
        winAmount = round2(stake * cloudProduct);
      }

      const historyDoc = await CloudSpreadHistory.create({
        roundId: randomInt(settings.roundIdMin, settings.roundIdMax),
        userId: user.userId,
        userName: user.altas,
        avatar: user.avatar || "",
        targetStep,
        targetMultiplier,
        betAmount: stake,
        sessionStake: stake,
        winAmount,
        isBot: true,
      });
      await publishCloudSpreadLiveRow(historyDoc);

      await trimOldBotRows(settings.maxBotRows);
    } catch (err) {
      console.error("[cloudSpreadBot]", err?.message || err);
    }
  });
}
