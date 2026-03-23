import mongoose from 'mongoose';

const MiningResultSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    bet: {
        type: Number,
        required: true,
    },
    isWin: {
        type: Boolean,
        required: false,
    },
    multiplier: {
        type: Number,
        required: false,
    },
    turn: {
        type: Number,
        required: true,
    },
    win: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('MiningResult', MiningResultSchema);