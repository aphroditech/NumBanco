import mongoose from "mongoose";

const gravityPointSchema = new mongoose.Schema(
  {
    t: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const GravityRoundSchema = new mongoose.Schema({
  roundId: { type: Number, required: true, unique: true, index: true },
  phase: {
    type: String,
    enum: ["betting", "viewing", "result", "closed"],
    default: "betting",
  },
  startAt: { type: Date, required: true },
  settleAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  startValue: { type: Number, required: true },
  endValue: { type: Number },
  result: { type: String, enum: ["up", "down"] },
  graphPoints: { type: [gravityPointSchema], default: [] },
  upTotalBet: { type: Number, default: 0 },
  downTotalBet: { type: Number, default: 0 },
});

GravityRoundSchema.index({ roundId: -1 });

export default mongoose.model("GravityRound", GravityRoundSchema);
