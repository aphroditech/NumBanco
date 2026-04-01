import mongoose from "mongoose";

const trenballBetSchema = new mongoose.Schema(
  {
    betId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    side: { type: String, enum: ["crash", "red", "green", "moon"], required: true },
    betAmount: { type: Number, required: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const TrenballRoundSchema = new mongoose.Schema({
  roundId: { type: Number, required: true, unique: true, index: true },
  phase: {
    type: String,
    enum: ["betting", "running", "result", "closed"],
    default: "betting",
  },
  startAt: { type: Date, required: true },
  bettingEndsAt: { type: Date, required: true },
  runStartedAt: { type: Date },
  runEndsAt: { type: Date },
  roundEndsAt: { type: Date },
  crashMultiplier: { type: Number },
  outcome: { type: String, enum: ["crash", "red", "green", "moon"] },
  users: { type: [trenballBetSchema], default: [] },
  crashTotalBet: { type: Number, default: 0 },
  redTotalBet: { type: Number, default: 0 },
  greenTotalBet: { type: Number, default: 0 },
  moonTotalBet: { type: Number, default: 0 },
});

TrenballRoundSchema.index({ roundId: -1 });

export default mongoose.model("TrenballRound", TrenballRoundSchema);
