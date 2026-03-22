import mongoose from "mongoose";

const CloudSpreadHistorySchema = new mongoose.Schema(
  {
    roundId: { type: Number, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    targetStep: { type: Number, min: 1, max: 8, required: true },
    targetMultiplier: { type: Number, required: true },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("CloudSpreadHistory", CloudSpreadHistorySchema);
