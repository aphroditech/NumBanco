import cron from "node-cron";
import User from "../../models/User.js";
import CloudSpreadHistory from "../../models/CloudSpreadHistory.js";

/** Per second tick: probability a bot “play” is logged (tune for feed density). */
const BOT_TRIGGER_PROBABILITY = 0.28;
/** Fraction of bot rows that show a win (green) vs loss (red). ~80% win / 20% loss. */
const BOT_WIN_PROBABILITY = 0.8;
/** Cap how many synthetic rows we keep (oldest bots removed only). */
const MAX_BOT_ROWS = 400;

const BET_AMOUNT_RANGES = [
  { min: 0.1, max: 2, probability: 0.28 },
  { min: 2, max: 8, probability: 0.28 },
  { min: 8, max: 16, probability: 0.24 },
  { min: 16, max: 28, probability: 0.2 },
];

function round2(v) {
  return Math.round(Number(v) * 100) / 100;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function multiplierForStep(step) {
  return 2 ** Number(step);
}

function randomBetAmount() {
  const r = Math.random();
  let acc = 0;
  let range = BET_AMOUNT_RANGES[0];
  for (const tier of BET_AMOUNT_RANGES) {
    acc += tier.probability;
    if (r < acc) {
      range = tier;
      break;
    }
  }
  const amount = range.min + Math.random() * (range.max - range.min);
  return round2(amount);
}

async function trimOldBotRows() {
  const count = await CloudSpreadHistory.countDocuments({ isBot: true });
  if (count <= MAX_BOT_ROWS) return;
  const excess = count - MAX_BOT_ROWS;
  const oldest = await CloudSpreadHistory.find({ isBot: true })
    .sort({ createdAt: 1 })
    .limit(excess)
    .select("_id")
    .lean();
  const ids = oldest.map((d) => d._id);
  if (ids.length) await CloudSpreadHistory.deleteMany({ _id: { $in: ids } });
}

/**
 * Inserts occasional CloudSpreadHistory rows from `partnerLevel: 0` users (same pattern as Rubic / Rocket bots).
 * Live feed polls `getCloudSpreadRoundHistory` — no Ably required.
 */
export async function cloudSpreadBot() {
  const botUsers = await User.find({ partnerLevel: 0 }).select("userId").lean();
  if (!botUsers?.length) {
    console.warn("[cloudSpreadBot] No partnerLevel:0 users — skipping bot feed");
    return;
  }

  cron.schedule("* * * * * *", async () => {
    if (Math.random() >= BOT_TRIGGER_PROBABILITY) return;
    try {
      const pick = botUsers[Math.floor(Math.random() * botUsers.length)];
      const user = await User.findOne({ userId: pick.userId });
      if (!user) return;

      const stake = randomBetAmount();
      const targetStep = randomInt(1, 8);
      const targetMultiplier = multiplierForStep(targetStep);
      const isWin = Math.random() < BOT_WIN_PROBABILITY;
      let winAmount = 0;
      if (isWin) {
        const cloudProduct = 0.4 + Math.random() * 6.5;
        winAmount = round2(stake * cloudProduct);
      }

      await CloudSpreadHistory.create({
        roundId: randomInt(1000, 9_999_999),
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

      await trimOldBotRows();
    } catch (err) {
      console.error("[cloudSpreadBot]", err?.message || err);
    }
  });
}
