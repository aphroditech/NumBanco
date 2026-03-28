import mongoose from "mongoose";

/**
 * Singleton doc. Per row key "8"…"16":
 * - `slotEntriesByRows` — preferred: [{ multiplier, rate }, …] (one object per bucket: payout × landing weight).
 * - `multiplierBandsByRows` — Mines-style bands for landing only; multipliers from entries / ladder.
 * - `slotPercentsByRows` + `slotMultipliersByRows` — legacy parallel arrays (fallback).
 */
const plinkoRateSettingsSchema = new mongoose.Schema(
  {
    /** Canonical ladder: length row+1, each `{ multiplier, rate }` (`weight` accepted as alias for `rate`). */
    slotEntriesByRows: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);  

export default mongoose.model("PlinkoRateSettings", plinkoRateSettingsSchema);
