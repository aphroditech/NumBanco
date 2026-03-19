import mongoose from "mongoose";

const UpDownGameStateSchema = new mongoose.Schema({
  phase: {
    type: String,
    enum: ["preview", "betting", "countdown", "trading", "result"],
    default: "preview",
  },
  phaseEndAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 1000),
  },
  currentRoundId: {
    type: Number,
    default: null,
  },
  /** Live 10s graph during preview/betting/countdown; persisted so refresh shows same graph */
  liveGraphPoints: [{ time: Number, value: Number }],
  flowCycleStartTime: { type: Number, default: null },
  liveGraphStartValue: { type: Number, default: null },
}, { timestamps: true });

export default mongoose.model("UpDownGameState", UpDownGameStateSchema);
