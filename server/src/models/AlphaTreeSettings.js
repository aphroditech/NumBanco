import mongoose from "mongoose";

const AlphaTreeSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String, default: "global" },
        /**
         * Probability that a letter (steps 2–9) lands in the high band (i.e. (1, max)).
         * Remaining probability is split equally between mid ((0.1,1)) and bust (0).
         */
        highBandRate: { type: Number, min: 0, max: 1 },
    },
    { collection: "alphatreesettings", timestamps: true }
);

export default mongoose.model("AlphaTreeSettings", AlphaTreeSettingsSchema);
