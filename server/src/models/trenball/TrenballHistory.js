import mongoose from "mongoose";

const trenballHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    roundId: { type: Number, required: true, index: true },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    side: { type: String, enum: ["crash", "red", "green", "moon"], required: true },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, default: 0 },
    crashMultiplier: { type: Number },
    outcome: { type: String, enum: ["crash", "red", "green", "moon"] },
    createAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

trenballHistorySchema.index({ userId: 1, createAt: -1 });
trenballHistorySchema.index({ createAt: -1 });

export default mongoose.model("TrenballHistory", trenballHistorySchema);
