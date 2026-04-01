import mongoose from "mongoose";

/** Win rate (0–1) per payout: half-open [min,max) unless closedUpper / openLower flags set. */
export const defaultHashWinRateBands = [
  { min: 1, max: 2, winRate: 0.8 },
  { min: 2, max: 3, winRate: 0.6 },
  { min: 3, max: 4, winRate: 0.2 },
  { min: 4, max: 5, winRate: 0.1 },
  { min: 5, max: 10, winRate: 0.01, closedUpper: true },
  { min: 10, max: 1e9, winRate: 0.001, openLower: true },
];

const hashDiceSettingSchema = new mongoose.Schema(
  {
    winRateBands: {
      type: [
        {
          min: { type: Number, required: true },
          max: { type: Number, required: true },
          winRate: { type: Number, required: true },
          closedUpper: { type: Boolean },
          openLower: { type: Boolean },
        },
      ],
      default: defaultHashWinRateBands,
    },
    /** Set hashMode to 1 when hashWinAmount > hashBetAmount * this (user winning heavily). */
    hashModeEnterProfitRatio: { type: Number, default: 1.2 },
    /** Set hashMode to 0 when hashWinAmount < hashBetAmount * this (wins lag bets). */
    hashModeExitLossRatio: { type: Number, default: 0.8 },
    /** In hashMode 1, multiply config win rate by this (first factor). */
    hashModeWinMultTight: { type: Number, default: 0.7 },
    /** In hashMode 1, multiply config win rate by this (second factor); effective = base × tight × soft. */
    hashModeWinMultSoft: { type: Number, default: 0.8 },
    /**
     * At least one loss every N bets (max N−1 consecutive wins). Change in DB to adjust behavior.
     * Values &lt; 2 disable this rule.
     */
    hashMinLossEveryNBets: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export default mongoose.model("HashDiceSetting", hashDiceSettingSchema);
