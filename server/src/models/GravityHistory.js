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
  avatar: {
    type: String,
    default: "",
  },
  direction: {
    type: String,
    enum: ["up", "down"],
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

// Allow a user to place both an "up" and "down" bet within the same round,
// but still prevent duplicate bets for the same side.
GravityHistorySchema.index({ roundId: 1, userId: 1, direction: 1 }, { unique: true });

export default mongoose.model("GravityHistory", GravityHistorySchema);    