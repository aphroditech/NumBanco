import mongoose from "mongoose";

/**
 * One document per real-user Double bet. Same bet row is also pushed onto User.doubleHistory.
 * Settlement updates winAmount / winningColor / winningSlot.
 */
const doubleHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    roundId: { type: Number, required: true, index: true },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    side: { type: String, enum: ["red", "black", "green"], required: true },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, default: 0 },
    winningColor: { type: String, enum: ["red", "black", "green"] },
    winningSlot: { type: Number },
    createAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

doubleHistorySchema.index({ userId: 1, createAt: -1 });
doubleHistorySchema.index({ createAt: -1 });

export default mongoose.model("DoubleHistory", doubleHistorySchema);
