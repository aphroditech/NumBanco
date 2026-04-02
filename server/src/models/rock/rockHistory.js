import mongoose from "mongoose";

const RockHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    history: {
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
export default mongoose.model("RockHistory", RockHistorySchema);