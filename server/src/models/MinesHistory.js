import mongoose from "mongoose";

const minesHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    history: {
      type: [
        {
          bet: { type: Number, required: true },
          multiplier: { type: Number, default: 0 },
          winAmt: { type: Number, default: 0 },
          profit: { type: Number, default: 0 },
          isWin: { type: Boolean, required: true },
          minesCount: { type: Number, default: 0 },
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("MinesHistory", minesHistorySchema);
