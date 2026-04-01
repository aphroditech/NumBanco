import mongoose from "mongoose";

/**
 * Public tarot round rows for RealView / Ably (`tarotviews` collection).
 * Same shape semantics as DiamondView for TwistRealViewRow mapping.
 */
const TarotViewSchema = new mongoose.Schema(
    {
        userName: { type: String, required: true },
        isWin: { type: Boolean, required: true, default: false },
        betAmount: { type: Number, required: true },
        /** Total multiplier shown in Result column */
        result: { type: String, required: true },
        winAmount: { type: Number, required: true, default: 0 },
        date: { type: Date, default: Date.now },
    },
    { collection: "tarotviews", timestamps: false }
);

TarotViewSchema.index({ date: -1 });

export default mongoose.model("TarotView", TarotViewSchema);
