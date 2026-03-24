import mongoose from "mongoose";

const AlphaTreeSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        /**
         * Fallback P(the clicked letter gets the high band) when `chosenLetterHighRate` is unset.
         * Steps 2–9 use a permutation: each of the three letters gets exactly one of zero / mid / high.
         */
        highBandRate: { type: Number, min: 0, max: 1 },
        /**
         * Optional override: probability (0–1) that the letter the user clicked receives the high band (1, max).
         */
        chosenLetterHighRate: { type: Number, min: 0, max: 1 },
        /**
         * Step 10 (Z): when set (0–1), P(high) = rate → draw in (1, max); remainder split evenly between mid (0.1,1) and 0.
         * When omitted, Z stays the legacy fixed multiplier (base×2^9 with mode tweak).
         */
        zButtonHighRate: { type: Number, min: 0, max: 1 },
    },
    { collection: "alphatreesettings", timestamps: true }
);

export default mongoose.model("AlphaTreeSettings", AlphaTreeSettingsSchema);
