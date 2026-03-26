import mongoose from "mongoose";

/** Public feed rows for Twist RealView (filled on spin result / bot). */
const TwistViewSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        bet: { type: Number, required: true },
        win: { type: Number, required: true },
        /** Result multiplier (or outcome value) displayed in RealView */
        result: { type: Number, required: true },
        /** Outcome image key: green | orange | purple | stone | mouse */
        symbol: { type: String, default: "stone" },
        isUser: { type: Number, default: 0 },
        time: { type: Date, default: Date.now },
    },
    { collection: "twistviews", timestamps: true }
);

export default mongoose.model("TwistView", TwistViewSchema);

