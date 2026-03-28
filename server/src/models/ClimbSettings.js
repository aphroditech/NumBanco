import mongoose from "mongoose";

const ModeSchema = new mongoose.Schema(
    {
        multipliers: { type: [Number], default: [] },
        /** Per pick: probability [0–1] of bust (ban). Default in app is 1/columns for that mode. */
        banRate: { type: Number, min: 0, max: 1 },
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
