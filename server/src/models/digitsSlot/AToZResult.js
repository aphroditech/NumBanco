import mongoose from "mongoose";

const AToZResultSchema = new mongoose.Schema({
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
  
  date: {
    type: Date,
    default: new Date()
  }
});

export default mongoose.model("AToZResult", AToZResultSchema);    