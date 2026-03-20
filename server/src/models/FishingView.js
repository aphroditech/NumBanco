import mongoose from "mongoose";

const FishingViewSchema = new mongoose.Schema({
    userId: {
        type: String,
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
    step: {
        type: Number,
        required: true
    },
    multi: {
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
    fishingBalance: {
        type: Number,
        required: true
    },
    isUser: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('FishingView', FishingViewSchema);