import mongoose from "mongoose";

/**
 * Singleton: Hash Dice synthetic feed (same pattern as `PlinkoBotSettings`).
 */
const hashDiceBotSettingsSchema = new mongoose.Schema(
  {
    winBotRate: { type: Number, default: 0.38, min: 0, max: 1 },
    loseBotRate: { type: Number, default: 0.38, min: 0, max: 1 },
    botRunIntervalMs: { type: Number, default: 3200, min: 800, max: 120000 },
  },
  { timestamps: true }
);

export default mongoose.model("HashDiceBotSettings", hashDiceBotSettingsSchema);
