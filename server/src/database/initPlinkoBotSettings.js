import PlinkoBotSettings from "../models/plinko/PlinkoBotSettings.js";

/**
 * Default bot landing bands by multiplier range (same shape as Mines).
 * Probabilities split across buckets whose ladder multiplier falls in [min, max] for each random row.
 * Tune min/max to your Plinko ladder (see `getPlinkoMultipliers`).
 */
export const DEFAULT_BOT_MULTIPLIER_BANDS = [
  { min: 0.1, max: 1, probability: 0.38 },
  { min: 1, max: 10, probability: 0.42 },
  { min: 10, max: 100000, probability: 0.2 },
];

/**
 * Singleton defaults for Plinko synthetic bots.
 * New documents get default `botMultiplierBands`. Older docs with an empty array are migrated once.
 */
export async function initializePlinkoBotSettings() {
  const res = await PlinkoBotSettings.updateOne(
    {},
    {
      $setOnInsert: {
        winBotRate: 0.35,
        loseBotRate: 0.35,
        botRunIntervalMs: 3000,
        botMultiplierBands: DEFAULT_BOT_MULTIPLIER_BANDS,
        botBandsMigratedV1: true,
      },
    },
    { upsert: true }
  );
  if (res.upsertedCount > 0) {
    console.log(
      "✅ Plinko bot settings: created default document (rates, interval, botMultiplierBands)"
    );
  }

  const mig = await PlinkoBotSettings.updateOne(
    {
      botBandsMigratedV1: { $ne: true },
      $or: [
        { botMultiplierBands: { $exists: false } },
        { botMultiplierBands: { $size: 0 } },
      ],
    },
    {
      $set: {
        botMultiplierBands: DEFAULT_BOT_MULTIPLIER_BANDS,
        botBandsMigratedV1: true,
      },
    }
  );
  if (mig.modifiedCount > 0) {
    console.log("✅ Plinko bot settings: seeded default botMultiplierBands (one-time migration)");
  }
}
