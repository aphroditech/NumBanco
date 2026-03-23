import mongoose from "mongoose";

const AlphaTreeSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        /** Base multiplier (step 1 “A”, and scales step 2–10 ladder). Default 0.6 */
        baseMultiplier: { type: Number, min: 0.01, max: 5 },
        /** Easy mode: chance to reroll band assignment when pick would bust (0–1) */
        easyBustRerollChance: { type: Number, min: 0, max: 1 },
        /** Mid-band RNG exponent for Easy (lower → more mass near 1) */
        midPowEasy: { type: Number, min: 0.05, max: 5 },
        midPowHard: { type: Number, min: 0.05, max: 5 },
        /** Stretch factor on high-band draw toward max for Easy / Hard */
        highStretchEasy: { type: Number, min: 0.5, max: 3 },
        highStretchHard: { type: Number, min: 0.5, max: 3 },
        /** Stretch factor on high-band draw toward max for Normal */
        highStretchNormal: { type: Number, min: 0.5, max: 3 },
        /**
         * Probability that a letter (steps 2–9) lands in the high band (i.e. (1, max)).
         * Remaining probability is split equally between mid ((0.1,1)) and bust (0).
         */
        highBandRate: { type: Number, min: 0, max: 1 },
        /** Extra multiplier on final Z step vs base × 2^9 */
        step10MultEasy: { type: Number, min: 0.5, max: 3 },
        step10MultHard: { type: Number, min: 0.5, max: 3 },
    },
    { collection: "alphatreesettings", timestamps: true }
);

export default mongoose.model("AlphaTreeSettings", AlphaTreeSettingsSchema);
