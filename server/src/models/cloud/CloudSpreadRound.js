import mongoose from "mongoose";

const cloudSpreadBetSchema = new mongoose.Schema(
  {
    betId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    targetStep: { type: Number, min: 1, max: 8, required: true },
    targetMultiplier: { type: Number, required: true },
    selectedCloudMultiplier: { type: Number, default: 1 },
    betAmount: { type: Number, required: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const CloudSpreadRoundSchema = new mongoose.Schema({
  /** Each user has their own rounds (like Rubic / Pumping). */
  userId: { type: String, required: true, index: true },
  roundId: { type: Number, required: true },
  phase: { type: String, enum: ["betting", "running", "result", "closed"], default: "betting" },
  startAt: { type: Date, required: true },
  runStartAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  crashStep: { type: Number, min: 1, max: 8, required: true },
  finalStep: { type: Number, min: 0, max: 8, default: 0 },
  finalClouds: { type: Number, default: 0 },
  users: { type: [cloudSpreadBetSchema], default: [] },
  totalBet: { type: Number, default: 0 },
  /** Paid once on the first play; later steps are free until cash-out. */
  sessionStake: { type: Number, default: 0 },
  /** In-session board state (per-user round); persisted so restarts don’t reset progress. */
  sessionClouds: { type: Number, default: 0 },
  sessionTrail: { type: [Number], default: [] },
  sessionMultipliers: { type: [Number], default: [] },
  /** When phase became `result` (cash-out / bust); used to advance after RESULT_MS. */
  resultSettledAt: { type: Date, default: null },
});

CloudSpreadRoundSchema.index({ userId: 1, roundId: -1 });
CloudSpreadRoundSchema.index({ userId: 1, roundId: 1 }, { unique: true });

export default mongoose.model("CloudSpreadRound", CloudSpreadRoundSchema);
