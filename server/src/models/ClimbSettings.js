import mongoose from "mongoose";

const ModeSchema = new mongoose.Schema(
    {
        multipliers: { type: [Number], default: [] },
        /** Per step (row 1→5): P(star) in [0–1]. Step index matches successCount before the pick. */
        starRates: { type: [Number], default: [] },
    },
    { _id: false }
);

const ClimbSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        easy: { type: ModeSchema, default: () => ({ multipliers: [] }) },
        normal: { type: ModeSchema, default: () => ({ multipliers: [] }) },
        hard: { type: ModeSchema, default: () => ({ multipliers: [] }) },
    },
    { collection: "climbsettings", timestamps: true }
);

export default mongoose.model("ClimbSettings", ClimbSettingsSchema);
