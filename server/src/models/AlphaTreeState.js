import mongoose from "mongoose";

/**
 * Active Alpha Tree round per user.
 * step: 1 = waiting for A; 2..10 = waiting for B/C/D; 11 = all draws done, cash out only.
 */
const AlphaTreeStateSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        betAmount: { type: Number, required: true },
        /** Product of all step multipliers so far */
        cumulativeMultiplier: { type: Number, required: true, default: 1 },
        /** 1 = need A; 2–10 = next random step index; 11 = finished draws */
        step: { type: Number, required: true, default: 1 },
        /** await_a | playing | await_cashout */
        phase: {
            type: String,
            enum: ["await_a", "playing", "await_cashout"],
            required: true,
            default: "await_a",
        },
        active: { type: Boolean, default: true },
        /**
         * Legacy: unused. Outcomes for steps 2–9 are drawn only when the user picks a letter.
         */
        bandPermutation: {
            type: [String],
            validate: {
                validator(v) {
                    if (v == null || v.length === 0) return true;
                    if (v.length !== 3) return false;
                    const allowed = new Set(["zero", "mid", "high"]);
                    return v.every((x) => allowed.has(x));
                },
                message: "bandPermutation must contain only zero/mid/high",
            },
        },
    },
    { timestamps: true }
);

export default mongoose.model("AlphaTreeState", AlphaTreeStateSchema);
