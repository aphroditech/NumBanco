import mongoose from 'mongoose';

const SnakeResultSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    isWin: {
        type: Boolean,
        required: true
    },
    multiplier: {
        type: Number,
        required: true
    },
    betAmount: {
        type: Number,
        required: true
    },
    winAmount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("SnakeResult", SnakeResultSchema);