import mongoose from "mongoose";

/**
 * One row per real-user Cloud Spread session when the round is settled (cash-out).
 * Bots do not write here — only `cloudSpreadGame.service` `settleRound` for human players.
 */
const CloudSpreadPlayRecordSchema = new mongoose.Schema(
  {
    roundId: { type: Number, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, default: 0 },
    crashStep: { type: Number, default: 1 },
    multProduct: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CloudSpreadPlayRecordSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("CloudSpreadPlayRecord", CloudSpreadPlayRecordSchema);
