import mongoose from "mongoose";

const plinkoResultSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    betAmount: { type: Number, default: 0 },
    multiplier: { type: Number, default: 0 },
    /** Gross return: stake × multiplier (shown in live feed WIN column). */
    win: { type: Number, default: 0 },
    /** Net profit (payout − stake) for UI coloring. */
    profit: { type: Number, default: 0 },
    rows: { type: Number, default: 16 },
    isBot: { type: Boolean, default: false },
  },
  { timestamps: true }
);

plinkoResultSchema.index({ createdAt: -1 });

export default mongoose.model("PlinkoResult", plinkoResultSchema);
