import mongoose from "mongoose";

const ThreeNumbersViewSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    bet: { 
        type: Number,
        required: true
    },
    result: {
        type: String,
        required: true
    },
    multi: {
        type: String,
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
    threeNumbersBalance: {
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

export default mongoose.model('ThreeNumbersView', ThreeNumbersViewSchema);