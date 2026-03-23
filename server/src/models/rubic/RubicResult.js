import mongoose from "mongoose";

const RubicResultSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
 },
  avatar: {
    type: String,
    required: true
  },
  isWin: {
    type: Boolean,
    required: true
  },
  multiplier: {
    type: Number,
    required: false
  },
  betAmount: {
    type: Number,
    required: true
  },
  winAmount: {
    type: Number,
    required: false
  },
  type: {
    type: Number,
    required: true,
    default: 1
  },
  createAt: {
    type: Date,
    default: new Date()
  }
});

export default mongoose.model("RubicResult", RubicResultSchema);    