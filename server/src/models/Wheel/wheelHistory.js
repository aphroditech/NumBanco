import mongoose from "mongoose";

const WheelHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    history : {
        type: [
            {
                isWin: {
                    type: Boolean,
                    default: 0,
                },
                betAmount: {
                    type: Number,
                    default: 0,
                },
                level: {
                    type: String,
                    default: "low",
                },
                multiplier: {
                    type: Number,
                    default: 0,
                },
                winAmount: {
                    type: Number,
                    default: 0,
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
});
export default mongoose.model("WheelHistory", WheelHistorySchema);