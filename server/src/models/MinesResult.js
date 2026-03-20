import mongoose from "mongoose";

const MinesResultSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    isWin: {
      type: Boolean,
      required: true,
    },
    betAmount: {
      type: Number,
      required: true,
    },
    winAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    multiplier: {
      type: Number,
      required: true,
      default: 0,
    },
    createAt: {
      type: Date,
      default: Date.now,
    },
  }
);

export default mongoose.model("MinesResult", MinesResultSchema);
