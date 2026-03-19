import mongoose from "mongoose";

const CocoStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    bet: { type: Number, required: true, default: 0 },
    successCount: { type: Number, required: true, default: 0 },
    currentMultiplier: { type: Number, required: true, default: 0 },
    totalSum: { type: Number, required: true, default: 0 },
    ready: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("CocoState", CocoStateSchema);