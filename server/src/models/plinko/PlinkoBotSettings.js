import mongoose from "mongoose";

/**
 * Singleton document: controls synthetic Plinko feed bots (not real user bets).
 * - winBotRate / loseBotRate: when `botMultiplierBands` is empty, split rounds into forced win / loss / natural roll.
 * - botMultiplierBands: optional `[{ min, max, probability }, …]` — landing weights by multiplier range (same idea as Mines / Plinko rates). When non-empty, slot choice uses these bands (per current row’s ladder) and win/lose is ignored for that round.
 * - botRunIntervalMs: delay between bot rounds (one round per tick).
 */
const plinkoBotSettingsSchema = new mongoose.Schema(
  {
    winBotRate: {
      type: Number,
      default: 0.35,
      min: 0,
      max: 1,
    },
    loseBotRate: {
      type: Number,
      default: 0.35,
      min: 0,
      max: 1,
    },
    botRunIntervalMs: {
      type: Number,
      default: 3000,
      min: 500,
      max: 120000,
    },
    /** Mines-style multiplier bands for bot feed only — maps probability mass onto bucket multipliers for the chosen row. */
    botMultiplierBands: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    /** Set once when default bands were applied (migration); keeps empty `[]` from being re-filled after user clears. */
    botBandsMigratedV1: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlinkoBotSettings", plinkoBotSettingsSchema);
