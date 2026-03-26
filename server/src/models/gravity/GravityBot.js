import mongoose from "mongoose";

/**
 * Per betting round: random number of up bots in [upBotsMin, upBotsMax], each with bet in [upBetMinAmount, upBetMaxAmount].
 * Same pattern for down. Edit this document to tune live bot behavior.
 * Legacy fields (totalBots, betsPerSecond, …) are kept for old records but the game loop uses the ranges below.
 */
const gravityBotSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    /** How many distinct bot users bet UP this round (uniform random between min and max, inclusive). */
    upBotsMin: { type: Number, default: 5 },
    upBotsMax: { type: Number, default: 10 },
    /** Bet amount range for UP bot bets (clamped to game max $50 and bot balance). */
    upBetMinAmount: { type: Number, default: 5 },
    upBetMaxAmount: { type: Number, default: 20 },
    downBotsMin: { type: Number, default: 6 },
    downBotsMax: { type: Number, default: 20 },
    downBetMinAmount: { type: Number, default: 2 },
    downBetMaxAmount: { type: Number, default: 30 },

    totalBots: { type: Number },
    betsPerSecond: { type: Number },
    upRatio: { type: Number },
    downRatio: { type: Number },
    minBet: { type: Number },
    maxBet: { type: Number },
    chanceToBet: { type: Number },
});

export default mongoose.model("GravityBot", gravityBotSchema);