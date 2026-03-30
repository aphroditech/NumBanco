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

const ModeTiersSchema = new mongoose.Schema(
    {
        tiers: { type: [TierSchema], default: [] },
    },
    { _id: false }
);

/**
 * Singleton document `_id: "global"`.
 * Each mode has 7 tiers (indices 0–6). Payout rates are taken from `modes.normal`; `easy` / `hard` store weights only
 * (rates on those subdocs are ignored at runtime and overwritten on read).
 * Legacy top-level `tiers` seeds `modes.normal` when migrating.
 *
 * `revenueAutoMode`: only `normalBandMin` / `normalBandMax` (easy if revenue < min, hard if revenue > max, else normal).
 */
const RevenueAutoModeSchema = new mongoose.Schema(
    {
        normalBandMin: { type: Number, default: -20 },
        normalBandMax: { type: Number, default: 20 },
    },
    { _id: false }
);

const DiamondSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        modes: {
            easy: { type: ModeTiersSchema, default: undefined },
            normal: { type: ModeTiersSchema, default: undefined },
            hard: { type: ModeTiersSchema, default: undefined },
        },
        tiers: { type: [TierSchema], default: [] },
        revenueAutoMode: { type: RevenueAutoModeSchema, default: undefined },
    },
    { collection: "diamondsettings", timestamps: true }
);

export default mongoose.model("DiamondSettings", DiamondSettingsSchema);
