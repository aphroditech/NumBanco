import mongoose from "mongoose";

const CocoRateSchema = new mongoose.Schema(
    {
        successCount: {
            type: Number,
            required: true,
            unique: true,
            index: true,
            min: 0,
        },
        // Optional legacy field: if present, treat as easyRate.
        rate: {
            type: Number,
            required: false,
            min: 0,
            max: 1,
        },

        // Mode-based rates (0=easy, 1=normal, 2=hard). Store as decimal probability (0.7 = 70%).
        easyRate: { type: Number, required: false, min: 0, max: 1 },
        normalRate: { type: Number, required: false, min: 0, max: 1 },
        hardRate: { type: Number, required: false, min: 0, max: 1 },
    },
    { timestamps: true }
);

export default mongoose.model("CocoRate", CocoRateSchema);
