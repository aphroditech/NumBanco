import mongoose from 'mongoose';

const SnakeHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    history: {
        type: [
            {
                betAmount: { type: Number, default: 0 },
                winAmount: { type: Number, default: 0 },
                multiplier: { type: Number, default: 0 },
                level: { type: String, default: "easy" },
                step: { type: String, default: "1" },
                isWin: { type: Boolean, default: false },
                date: { type: Date, default: Date.now }
            }
        ]
    },
    date: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("SnakeHistory", SnakeHistorySchema);