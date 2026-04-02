import mongoose from "mongoose";

const FastCrashSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "default" },
  winRate40: { type: Number, default: 0.4 },
  // Bot Controls
  botMaxPerTick: { type: Number, default: 6 },
  botMinBet: { type: Number, default: 0.1 },
  botMaxBet: { type: Number, default: 20 },
  botGreenWeight: { type: Number, default: 40 },
  botRedWeight: { type: Number, default: 40 },
  botVioletWeight: { type: Number, default: 10 },
  botNumberWeight: { type: Number, default: 10 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("FastCrashSettings", FastCrashSettingsSchema);