import mongoose from "mongoose";

const trenballBotSettingsSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },

  // Per-round bot counts by side (uniform random in [min, max]).
  crashBotsMin: { type: Number, default: 1 },
  crashBotsMax: { type: Number, default: 3 },
  redBotsMin: { type: Number, default: 3 },
  redBotsMax: { type: Number, default: 7 },
  greenBotsMin: { type: Number, default: 3 },
  greenBotsMax: { type: Number, default: 7 },
  moonBotsMin: { type: Number, default: 0 },
  moonBotsMax: { type: Number, default: 2 },

  // Bet amount ranges by side.
  crashBetMinAmount: { type: Number, default: 0.1 },
  crashBetMaxAmount: { type: Number, default: 5 },
  redBetMinAmount: { type: Number, default: 0.1 },
  redBetMaxAmount: { type: Number, default: 20 },
  greenBetMinAmount: { type: Number, default: 0.1 },
  greenBetMaxAmount: { type: Number, default: 20 },
  moonBetMinAmount: { type: Number, default: 0.1 },
  moonBetMaxAmount: { type: Number, default: 10 },

  // User-requested configurable rates:
  // 1) If A+B > C+D and C*2 + 10*D < A+B: moon (>10x) chance.
  moonChancePercent: { type: Number, default: 10 },
  // 2) If A+B < C+D and A*50 < B+C+D: instant crash (1.00x) chance.
  instantCrashChancePercent: { type: Number, default: 2 },
});

export default mongoose.model("TrenballBotSettings", trenballBotSettingsSchema);
