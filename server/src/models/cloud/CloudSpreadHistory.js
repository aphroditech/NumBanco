import mongoose from "mongoose";

const CloudSpreadHistorySchema = new mongoose.Schema(
  {
    roundId: { type: Number, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    avatar: { type: String, default: "" },
    targetStep: { type: Number, min: 1, max: 8, required: true },
    targetMultiplier: { type: Number, required: true },
    betAmount: { type: Number, required: true },
    /** Same as round entry — shown on every step row (step 1 pays; later steps are 0). */
    sessionStake: { type: Number, default: 0 },
    winAmount: { type: Number, default: 0 },
    /** Synthetic rows for live feed (partnerLevel 0 users) — never delete real users’ rows by mistake. */
    isBot: { type: Boolean, default: false, index: true },
    /** One row per round when the user cashes out (or bust / settle). */
    isCashOutSummary: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("CloudSpreadHistory", CloudSpreadHistorySchema);
