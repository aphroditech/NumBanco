import mongoose from "mongoose";

const defaultMultiplierBands = [
  { min: 1, max: 10, probability: 0.7 },
  { min: 10, max: 100, probability: 0.2 },
  { min: 100, max: 1000, probability: 0.09 },
];

const defaultEasyMultipliers = [
  0.5, 0.8, 1.1, 1.15, 1.21, 1.27, 1.34, 1.42, 1.51, 1.61, 1.72, 1.86,
  2.01, 2.19, 2.41, 2.68, 3.02, 3.45, 4.02, 4.83, 6.03, 8.04, 12.06,
];
const defaultNormalMultipliers = [
  0.6, 0.9, 1.02, 1.25, 1.38, 1.52, 1.69, 1.89, 2.13, 2.41, 2.76, 3.18,
  3.8, 4.35, 5.4, 6.87, 8.56, 10.86, 20.5, 43.56, 89.88,
];
const defaultHardMultipliers = [
  0.7, 0.9, 1.05, 1.44, 1.66, 1.87, 2.04, 2.54, 2.79, 3.01, 3.69, 3.9,
  4.24, 5.84, 10.87, 24.68, 50.65, 100.98, 210.65,
];
const defaultAceMultipliers = [
  0.7, 1.1, 1.44, 1.96, 2.34, 3.48, 4.92, 5.83, 8.64, 13.56, 25.68, 38.96,
  68.48, 100.96, 200.12, 420.45, 842.56,
];

/** Win rate (0–1) per multiplier band: (0,1]=90%, (1,2]=60%, (2,3]=40%, (3,4]=20%, (4,5]=10%, (5,10]=5%, >10=0%. */
const defaultWinRateBands = [
  { min: 0, max: 1, rate: 0.9 },
  { min: 1, max: 2, rate: 0.6 },
  { min: 2, max: 3, rate: 0.4 },
  { min: 3, max: 4, rate: 0.2 },
  { min: 4, max: 5, rate: 0.1 },
  { min: 5, max: 10, rate: 0.05 },
  { min: 10, max: 1e9, rate: 0 },
];

const MinesSettingSchema = new mongoose.Schema(
  {
    botWinProbability: {
      type: Number,
      default: 0.55,
    },
    botTriggerProbability: {
      type: Number,
      default: 0.4,
    },
    multiplierBands: {
      type: [
        {
          min: { type: Number, required: true },
          max: { type: Number, required: true },
          probability: { type: Number, required: true },
        },
      ],
      default: defaultMultiplierBands,
    },
    /** Multipliers per revealed safe tile for easy (2 mines, 23 safe). */
    easyMultipliers: { type: [Number], default: undefined },
    /** Multipliers per revealed safe tile for normal (4 mines, 21 safe). */
    normalMultipliers: { type: [Number], default: undefined },
    /** Multipliers per revealed safe tile for hard (6 mines, 19 safe). */
    hardMultipliers: { type: [Number], default: undefined },
    /** Multipliers per revealed safe tile for ace (8 mines, 17 safe). */
    aceMultipliers: { type: [Number], default: undefined },
    /** When user.minesMode is 2, effective win rate = winRate * minesMode2RateFactor (stored in DB). */
    minesMode2RateFactor: { type: Number, default: 0.7 },
    /** Switch to minesMode 2 when minesWinAmount > minesAmount * minesMode1To2Threshold (user winning a lot). */
    minesMode1To2Threshold: { type: Number, default: 1.2 },
    /** Switch from minesMode 2 to 1 when minesWinAmount <= minesAmount * minesMode2To1Threshold. */
    minesMode2To1Threshold: { type: Number, default: 0.7 },
    /** Win rate per multiplier band: [{ min, max, rate }]. Used by getWinRateForMultiplier. */
    winRateBands: {
      type: [
        { min: { type: Number, required: true }, max: { type: Number, required: true }, rate: { type: Number, required: true } },
      ],
      default: undefined,
    },
  },
  { timestamps: true }
);

export {
  defaultMultiplierBands,
  defaultEasyMultipliers,
  defaultNormalMultipliers,
  defaultHardMultipliers,
  defaultAceMultipliers,
  defaultWinRateBands,
};

export default mongoose.model("MinesSetting", MinesSettingSchema);

