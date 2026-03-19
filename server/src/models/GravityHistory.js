import mongoose from "mongoose";

const GravityHistorySchema = new mongoose.Schema({
  roundId: {
    type: Number,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  betAmount: {
    type: Number,
    required: true,
  },
  winAmount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

GravityHistorySchema.index({ roundId: 1, userId: 1 }, { unique: true });

export default mongoose.model("GravityHistory", GravityHistorySchema);    