import mongoose from "mongoose";

/** Public feed rows for Climb RealView (cash out, full clear, bust, bot). */
const ClimbViewSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        bet: { type: Number, required: true },
        win: { type: Number, required: true },
        /** Final ladder multiplier shown as Result (e.g. 2.5x); 0 on bust / bot filler */
        result: { type: Number, required: true },
        /** Round grid mode: easy | normal | hard */
        mode: { type: String, default: "easy" },
        symbol: { type: String, default: "climb" },
        isUser: { type: Number, default: 0 },
        time: { type: Date, default: Date.now },
    },
    { collection: "climbviews", timestamps: true }
);

export default mongoose.model("ClimbView", ClimbViewSchema);
