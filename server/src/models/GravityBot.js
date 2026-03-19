import mongoose from "mongoose";

const gravityBotSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true
    },
    totalBots: {
        type: Number,
    },
    betsPerSecond: {
        type: Number,
    },
    upRatio: {
        type: Number,
    },
    downRatio: {
        type: Number,
    },
    minBet: {
        type: Number,
    },
    maxBet: {
        type: Number,
    },
    chanceToBet: {
        type: Number,
    },
});

export default mongoose.model('GravityBot', gravityBotSchema);