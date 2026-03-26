import mongoose from "mongoose";

const doubleBetSchema = new mongoose.Schema(
  {
    betId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    side: { type: String, enum: ["red", "black", "green"], required: true },
    betAmount: { type: Number, required: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const DoubleRoundSchema = new mongoose.Schema({
  roundId: { type: Number, required: true, unique: true, index: true },
  phase: {
    type: String,
    enum: ["betting", "rolling", "result", "closed"],
    default: "betting",
  },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  winningSlot: { type: Number },
  winningColor: { type: String, enum: ["red", "black", "green"] },
  users: { type: [doubleBetSchema], default: [] },
  redTotalBet: { type: Number, default: 0 },
  blackTotalBet: { type: Number, default: 0 },
  greenTotalBet: { type: Number, default: 0 },
});

DoubleRoundSchema.index({ roundId: -1 });

export default mongoose.model("DoubleRound", DoubleRoundSchema);
