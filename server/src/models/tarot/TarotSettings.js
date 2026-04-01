import mongoose from "mongoose";

const TarotRateRowSchema = new mongoose.Schema(
    {
        value: { type: Number, required: true },
        rate: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const TarotModeRatesSchema = new mongoose.Schema(
    {
        base: { type: [TarotRateRowSchema], default: [] },
        side: { type: [TarotRateRowSchema], default: [] },
    },
    { _id: false }
);

const TarotSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        easy: { type: TarotModeRatesSchema, default: undefined },
        normal: { type: TarotModeRatesSchema, default: undefined },
        hard: { type: TarotModeRatesSchema, default: undefined },
        base: { type: [TarotRateRowSchema], default: [] },
        side: { type: [TarotRateRowSchema], default: [] },
        revenueAutoMode: {
            normalBandMin: { type: Number, default: -20 },
            normalBandMax: { type: Number, default: 20 },
        },
    },
    { collection: "tarotsettings", timestamps: true }
);

export default mongoose.model("TarotSettings", TarotSettingsSchema);
