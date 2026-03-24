import mongoose from 'mongoose';

const RocketResultSchema = new mongoose.Schema({
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
    multiplier: {
        type: Number,
        required: false,
    },
    isWin: {
        type: Boolean,
        required: false,
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

export default mongoose.model('RocketResult', RocketResultSchema);