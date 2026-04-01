import mongoose from "mongoose";

/** One row per real Hash Dice round (for analytics / admin calendar views). */
const calendarHashSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    betAmount: { type: Number, default: 0 },
    payout: { type: Number, default: 0 },
    side: { type: Number, default: 0 },
    roll: { type: Number, default: 0 },
    isWin: { type: Boolean, default: false },
    winAmount: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    hashMode: { type: Number, default: 0 },
    effectiveWinRate: { type: Number, default: 0 },
    forcedLoss: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "calendarhash" }
);

calendarHashSchema.index({ createdAt: -1 });
calendarHashSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("CalendarHash", calendarHashSchema);
