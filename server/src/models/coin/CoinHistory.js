import mongoose from "mongoose";

const CoinHistorySchema = new mongoose.Schema({
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
                flip: {
                    type: Number,
                    default: 0, // 0=HEADS, 1=TAILS
                },
                result: {
                    type: Number,
                    default: 0, // 0=HEAD, 1=TAILS
                },
                betAmount: {
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
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model("CoinHistory", CoinHistorySchema);    