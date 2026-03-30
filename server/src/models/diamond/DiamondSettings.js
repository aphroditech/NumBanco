import mongoose from "mongoose";

const TierSchema = new mongoose.Schema(
    {
        /** Payout multiplier (win = bet × rate). */
        rate: { type: Number, required: true },
        /** Relative hit weight; normalized to probabilities on read (need not sum to 1). */
        weight: { type: Number, required: true, default: 0 },
    },
    { _id: false }
);

/**
 * Singleton document `_id: "global"`.
 * `tiers.length` must match board pattern count (7): one row per visual tier index.
 */
const DiamondSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        tiers: { type: [TierSchema], default: [] },
    },
    { collection: "diamondsettings", timestamps: true }
);

export default mongoose.model("DiamondSettings", DiamondSettingsSchema);
