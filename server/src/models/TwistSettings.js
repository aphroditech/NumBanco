import mongoose from "mongoose";

const TwistSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        easy: {
            pRate: { type: Number, min: 0 },
            oRate: { type: Number, min: 0 },
            gRate: { type: Number, min: 0 },
            mouseRate: { type: Number, min: 0 },
            stoneRate: { type: Number, min: 0 },
        },
        normal: {
            pRate: { type: Number, min: 0 },
            oRate: { type: Number, min: 0 },
            gRate: { type: Number, min: 0 },
            mouseRate: { type: Number, min: 0 },
            stoneRate: { type: Number, min: 0 },
        },
        hard: {
            pRate: { type: Number, min: 0 },
            oRate: { type: Number, min: 0 },
            gRate: { type: Number, min: 0 },
            mouseRate: { type: Number, min: 0 },
            stoneRate: { type: Number, min: 0 },
        },
    },
    { collection: "twistsettings", timestamps: true }
);

export default mongoose.model("TwistSettings", TwistSettingsSchema);
