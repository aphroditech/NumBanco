import mongoose from "mongoose";

const ClimbStateSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        betAmount: { type: Number, required: true },
        mode: { type: String, enum: ["easy", "normal", "hard"], required: true },
        /** Current playable row index (bottom->top): starts at 4, then 3..0, -1 means all rows cleared. */
        activeRow: { type: Number, required: true, default: 4 },
        /** Number of successful picks so far (0..5). */
        successCount: { type: Number, required: true, default: 0 },
        /** Current multiplier for cashout (1 when no success yet). */
        currentMultiplier: { type: Number, required: true, default: 1 },
        /** Ends round when busted or cashed out. */
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model("ClimbState", ClimbStateSchema);
