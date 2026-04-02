import mongoose from "mongoose";

const fastCrashBetSchema = new mongoose.Schema(
  {
    betId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    side: { type: String, enum: ["green", "red", "violet", "number"], required: true },
    digit: { type: Number, min: 0, max: 9 },
    betAmount: { type: Number, required: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const FastCrashRoundSchema = new mongoose.Schema({
  roundId: { type: Number, required: true, unique: true, index: true },
  phase: {
    type: String,
    enum: ["betting", "rolling", "result", "closed"],
    default: "betting",
  },
  startAt: { type: Date, required: true },
  bettingEndsAt: { type: Date, required: true },
  roundEndsAt: { type: Date },
  winningDigit: { type: Number, min: 0, max: 9 },
  resultColor: { type: String, enum: ["green", "red", "violet"] },
  users: { type: [fastCrashBetSchema], default: [] },
  greenTotalBet: { type: Number, default: 0 },
  redTotalBet: { type: Number, default: 0 },
  violetTotalBet: { type: Number, default: 0 },
  numberTotalBet: { type: Number, default: 0 },
});

FastCrashRoundSchema.index({ roundId: -1 });

export default mongoose.model("FastCrashRound", FastCrashRoundSchema);
