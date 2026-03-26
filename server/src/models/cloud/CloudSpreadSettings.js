import mongoose from "mongoose";

/** Single source of truth for create + startup backfill of older docs. */
export const DEFAULT_BET_AMOUNT_TIERS = [
  { min: 0.1, max: 2, probability: 0.28 },
  { min: 2, max: 8, probability: 0.28 },
  { min: 8, max: 16, probability: 0.24 },
  { min: 16, max: 28, probability: 0.2 },
];

export const DEFAULT_LIMIT_MODE_1_TO_2 = 1.2;
export const DEFAULT_LIMIT_MODE_2_TO_1 = 0.7;

export const DEFAULT_STEP_MULTIPLIER_PROFILES = [
  { step: 1, bands: [{ min: 0, max: 0, weight: 10 }, { min: 0, max: 1, weight: 50 }, { min: 1, max: 2, weight: 35 }] },
  { step: 2, bands: [{ min: 0, max: 0, weight: 15 }, { min: 0, max: 1, weight: 45 }, { min: 1, max: 2, weight: 30 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }] },
  { step: 3, bands: [{ min: 0, max: 0, weight: 20 }, { min: 0, max: 1, weight: 40 }, { min: 1, max: 2, weight: 25 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 4, bands: [{ min: 0, max: 0, weight: 25 }, { min: 0, max: 1, weight: 35 }, { min: 1, max: 2, weight: 25 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 5, bands: [{ min: 0, max: 0, weight: 30 }, { min: 0, max: 1, weight: 35 }, { min: 1, max: 2, weight: 20 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 6, bands: [{ min: 0, max: 0, weight: 35 }, { min: 0, max: 1, weight: 35 }, { min: 1, max: 2, weight: 20 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 7, bands: [{ min: 0, max: 0, weight: 40 }, { min: 0, max: 1, weight: 25 }, { min: 1, max: 2, weight: 25 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
  { step: 8, bands: [{ min: 0, max: 0, weight: 50 }, { min: 0, max: 1, weight: 25 }, { min: 1, max: 2, weight: 15 }, { min: 2, max: 3, weight: 5 }, { min: 3, max: 4, weight: 4 }, { min: 4, max: 5, weight: 1 }] },
];

const betAmountTierSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    /** Weight for random tier pick (same pattern as Rocket / bot stake tiers). */
    probability: { type: Number, required: true },
  },
  { _id: false }
);

const multiplierBandSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    /** Weight (relative probability); does not have to sum exactly to 100. */
    weight: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const stepMultiplierProfileSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true, min: 1, max: 8 },
    bands: { type: [multiplierBandSchema], default: [] },
  },
  { _id: false }
);

/**
 * Singleton-style settings for Cloud Spread synthetic bot feed (tunable without deploy).
 */
const cloudSpreadSettingsSchema = new mongoose.Schema(
  {
    /** P(win) per bot row — green vs red in live feed. */
    botWinProbability: { type: Number, default: 0.8, min: 0, max: 1 },
    /** Per-second probability that a bot “play” is generated (feed density). */
    botTriggerProbability: { type: Number, default: 0.28, min: 0, max: 1 },
    /** Max `CloudSpreadHistory` rows with `isBot: true` before oldest bots are deleted. */
    maxBotRows: { type: Number, default: 400, min: 1 },
    /** Stake tiers for random bot bet amount. */
    betAmountTiers: {
      type: [betAmountTierSchema],
      default: () => structuredClone(DEFAULT_BET_AMOUNT_TIERS),
    },
    /** When bot wins: win = stake * (random in [winProductMin, winProductMax]). */
    winProductMin: { type: Number, default: 0.4 },
    winProductMax: { type: Number, default: 6.9 },
    /** Random `targetStep` for bot rows (inclusive). */
    targetStepMin: { type: Number, default: 1, min: 1, max: 8 },
    targetStepMax: { type: Number, default: 8, min: 1, max: 8 },
    /** Random `roundId` for bot rows (inclusive). */
    roundIdMin: { type: Number, default: 1000 },
    roundIdMax: { type: Number, default: 9_999_999 },
    /** User mode switch: mode 1 -> 2 when `cloudAmount * limitMode1To2 < cloudWinAmount`. */
    limitMode1To2: { type: Number, default: DEFAULT_LIMIT_MODE_1_TO_2 },
    /** User mode switch: mode 2 -> 1 when `cloudAmount * limitMode2To1 > cloudWinAmount`. */
    limitMode2To1: { type: Number, default: DEFAULT_LIMIT_MODE_2_TO_1 },
    /**
     * Step-based cloud multiplier distribution used by the game board (editable in DB).
     * Example band: { min: 0, max: 1, weight: 45 }.
     */
    stepMultiplierProfiles: {
      type: [stepMultiplierProfileSchema],
      default: () => structuredClone(DEFAULT_STEP_MULTIPLIER_PROFILES),
    },
  },
  { timestamps: true }
);

export default mongoose.model("CloudSpreadSettings", cloudSpreadSettingsSchema);
