import mongoose from "mongoose";

/** Public feed rows for Alpha Tree RealView (filled on cash-out). */
const AlphaTreeViewSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        bet: { type: Number, required: true },
        win: { type: Number, required: true },
        /** Total cumulative multiplier at cash-out */
        result: { type: Number, required: true },
        isUser: { type: Number, default: 0 },
        time: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model("AlphaTreeView", AlphaTreeViewSchema);
