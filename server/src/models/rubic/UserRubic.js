import mongoose from "mongoose";

const UserRubicSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
  },
  isWin: {
    type: Boolean,
    required: true
  },
  betAmount: {
    type: Number,
    required: true
  },
  winAmount: {
    type: Number,
    required: false
  },
}, { timestamps: true });

export default mongoose.model("UserRubic", UserRubicSchema);    