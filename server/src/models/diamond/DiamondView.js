import mongoose from "mongoose";

/**
 * Public diamond round rows for RealView / Ably (`diamondviews` collection).
 * Shape matches what `fetchDiamondLivePayload` maps to the client.
 */
const DiamondViewSchema = new mongoose.Schema(
    {
        userName: { type: String, required: true },
        isWin: { type: Boolean, required: true, default: false },
        betAmount: { type: Number, required: true },
        /** Multiplier shown in Result column, e.g. "2.00" */
        level: { type: String, required: true },
        winAmount: { type: Number, required: true, default: 0 },
        date: { type: Date, default: Date.now },
    },
    { collection: "diamondviews", timestamps: false }
);

DiamondViewSchema.index({ date: -1 });

export default mongoose.model("DiamondView", DiamondViewSchema);
