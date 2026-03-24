import mongoose from "mongoose";

const doveHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    history: {
        type: [
            {
                bet: {
                    type: Number,
                    required: true
                },
                multiplier: {
                    type: Number,
                    required: true
                },
                winAmt: {
                    type: Number,
                    required: true
                },
                profit: {
                    type: Number,
                    default: 0
                },
                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
}, { timestamps: true });

doveHistorySchema.index({ user: 1 });

export default mongoose.model("DoveHistory", doveHistorySchema);