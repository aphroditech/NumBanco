import mongoose from "mongoose";

/** Public live ticker: real bets + synthetic bots (same role as `PlinkoResult`). */
const hashDiceResultSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    betAmount: { type: Number, default: 0 },
    /** win / bet (0 on loss). */
    multiplier: { type: Number, default: 0 },
    /** Gross return (0 on loss). */
    win: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    payout: { type: Number, default: 0 },
    side: { type: Number, default: 0 },
    roll: { type: Number, default: 0 },
    isBot: { type: Boolean, default: false },
  },
  { timestamps: true }
);

hashDiceResultSchema.index({ createdAt: -1 });
hashDiceResultSchema.index({ isBot: 1, createdAt: -1 });

export default mongoose.model("HashDiceResult", hashDiceResultSchema);
