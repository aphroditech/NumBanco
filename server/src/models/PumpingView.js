import mongoose from "mongoose";

const PumpingViewSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    target: {
        type: Number,
        required: true
    },
    bet: { 
        type: Number,
        required: true
    },
    win: {
        type: Number,
        required: true
    },
    result: {
        type: Number,
        required: true
    },
    totalBet: {
        type: Number,
        required: true
    },
    totalWin: {
        type: Number,
        required: true
    },
    pumpingBalance: {
        type: Number,
        required: true
    },
    isUser: {
        type: Number,
        default: 0
    },
    time: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('PumpingView', PumpingViewSchema);