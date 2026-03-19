import mongoose from "mongoose";

const UpDownRoundSchema = new mongoose.Schema({
  roundId: {
    type: Number,
    required: true,
    unique: true,
  },
  result: {
    type: String,
    enum: ["up", "down"],
  },
  /** Winning side; same as result, kept for clarity */
  winnerSide: { type: String, enum: ["up", "down"] },
  /** Losing side (bigger total bet) */
  loserSide: { type: String, enum: ["up", "down"] },
  /** Total amount bet on UP (for display) */
  upTotalBet: { type: Number, default: 0 },
  /** Total amount bet on DOWN (for display) */
  downTotalBet: { type: Number, default: 0 },
  startValue: {
    type: Number,
  },
  endValue: {
    type: Number,
  },
  graphData: [
    {
      time: Number,
      value: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UpDownRoundSchema.index({ roundId: -1 });

export default mongoose.model("UpDownRound", UpDownRoundSchema);
