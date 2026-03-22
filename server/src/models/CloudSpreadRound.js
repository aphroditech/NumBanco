import mongoose from "mongoose";

const cloudSpreadBetSchema = new mongoose.Schema(
  {
    betId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    targetStep: { type: Number, min: 1, max: 8, required: true },
    targetMultiplier: { type: Number, required: true },
    betAmount: { type: Number, required: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const CloudSpreadRoundSchema = new mongoose.Schema({
  roundId: { type: Number, required: true, unique: true, index: true },
  phase: { type: String, enum: ["betting", "running", "result", "closed"], default: "betting" },
  startAt: { type: Date, required: true },
  runStartAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  crashStep: { type: Number, min: 1, max: 8, required: true },
  finalStep: { type: Number, min: 0, max: 8, default: 0 },
  finalClouds: { type: Number, default: 0 },
  users: { type: [cloudSpreadBetSchema], default: [] },
  totalBet: { type: Number, default: 0 },
});

CloudSpreadRoundSchema.index({ roundId: -1 });

export default mongoose.model("CloudSpreadRound", CloudSpreadRoundSchema);
