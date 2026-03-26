import mongoose from "mongoose";

const DiceViewSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    bet: { 
        type: Number,
        required: true
    },
    dice: {
        type: Number,
        required: true
    },
    type: {
        type: Number,
        required: true
    },
    win: {
        type: Number,
        required: true
    },
    totalBet: {
        type: Number,
        default: 0
    },
    totalWin: {
        type: Number,
        default: 0
    },
    diceBalance: {
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

export default mongoose.model('DiceView', DiceViewSchema);