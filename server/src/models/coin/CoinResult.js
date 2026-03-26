import mongoose from "mongoose";

const CoinResultSchema = new mongoose.Schema({
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
    flip: {
        type: Number,
        required: true
    },
    result: {
        type: Number,
        required: true
    },
    betAmount: {
        type: Number,
        required: true
    },
    winAmount: {
        type: Number,
        required: false
    },
    
    date: {
        type: Date,
        default: new Date()
    }
});

export default mongoose.model("CoinResult", CoinResultSchema);    