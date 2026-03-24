import mongoose from "mongoose";

const CardGameViewSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    bet: { 
        type: Number,
        required: true
    },
    arrow: {
        type: String,
        enum: ['<', '=', '>'],
        required: true
    },
    left: {
        type: Number,
        required: true
    },
    right: {
        type: Number,
        required: true
    },
    win: {
        type: Number,
        default: 0
    },
    totalBet: {
        type: Number,
        default: 0
    },
    totalWin: {
        type: Number,
        default: 0
    },
    cardGameBalance: {
        type: Number,
        default: 0
    },
    isUser: {
        type: Number,
        default: 0
    },
    time: {
        type: Date,
        default: Date.now()
    },
}, { timestamps: true });

export default mongoose.model('CardGameView', CardGameViewSchema);