import mongoose from "mongoose";

/**
 * Single-document config for Double live bots (partnerLevel 0 users).
 * Edit in MongoDB; server reloads periodically and applies on each new betting round.
 */
const doubleBotSettingsSchema = new mongoose.Schema(
  {
    /** Only one logical row — query with findOne(). */
    label: { type: String, default: "default", unique: true, index: true },

    enabled: { type: Boolean, default: true },

    redMinShows: { type: Number, default: 5 },
    redMaxShows: { type: Number, default: 8 },
    redMinAmount: { type: Number, default: 3 },
    redMaxAmount: { type: Number, default: 45 },

    greenMinShows: { type: Number, default: 1 },
    greenMaxShows: { type: Number, default: 3 },
    greenMinAmount: { type: Number, default: 1 },
    greenMaxAmount: { type: Number, default: 50 },

    blackMinShows: { type: Number, default: 6 },
    blackMaxShows: { type: Number, default: 9 },
    blackMinAmount: { type: Number, default: 2 },
    blackMaxAmount: { type: Number, default: 40 },

    /** How often the game loop reloads this doc from Mongo (ms). */
    settingsRefreshMs: { type: Number, default: 5000 },
  },
  { timestamps: true }
);

export default mongoose.model("DoubleBotSettings", doubleBotSettingsSchema);

/** Defaults used for first-time upsert (matches product request). */
export const DOUBLE_BOT_DEFAULTS = {
  label: "default",
  enabled: true,
  redMinShows: 5,
  redMaxShows: 8,
  redMinAmount: 3,
  redMaxAmount: 45,
  greenMinShows: 1,
  greenMaxShows: 3,
  greenMinAmount: 1,
  greenMaxAmount: 50,
  blackMinShows: 6,
  blackMaxShows: 9,
  blackMinAmount: 2,
  blackMaxAmount: 40,
  settingsRefreshMs: 5000,
};
