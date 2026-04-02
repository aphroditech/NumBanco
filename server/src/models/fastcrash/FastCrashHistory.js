import mongoose from "mongoose";

const fastCrashHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    roundId: { type: Number, required: true, index: true },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    side: { type: String, enum: ["green", "red", "violet", "number"], required: true },
    digit: { type: Number, min: 0, max: 9 },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, default: 0 },
    winningDigit: { type: Number },
    resultColor: { type: String, enum: ["green", "red", "violet"] },
    createAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

fastCrashHistorySchema.index({ userId: 1, createAt: -1 });
fastCrashHistorySchema.index({ createAt: -1 });

export default mongoose.model("FastCrashHistory", fastCrashHistorySchema);
