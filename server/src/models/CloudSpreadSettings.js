import mongoose from "mongoose";

const betAmountTierSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    /** Weight for random tier pick (same pattern as Rocket / bot stake tiers). */
    probability: { type: Number, required: true },
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
      default: () => [
        { min: 0.1, max: 2, probability: 0.28 },
        { min: 2, max: 8, probability: 0.28 },
        { min: 8, max: 16, probability: 0.24 },
        { min: 16, max: 28, probability: 0.2 },
      ],
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
  },
  { timestamps: true }
);

export default mongoose.model("CloudSpreadSettings", cloudSpreadSettingsSchema);
