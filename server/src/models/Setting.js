import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({
    confirmation: {
        type: Number,
        required: true
    },
    pollTron: {
        type: Number,
        required: true
    },
    confirmationTron: {
        type: Number,
        required: true
    },
    fundMerge: {
        type: Number,
        required: true
    },
    feeTank: {
        type: Number,
        required: true
    },
    dailyTank: {
        type: Number,
        required: true
    },
    ethLimit: {
        type: Number,
        required: true
    },
    bscLimit: {
        type: Number,
        required: true
    },
    tronLimit: {
        type: Number,
        required: true
    },
    tronTransactionLimit: {
        type: Number,
        required: true
    },
    botAPerBet: {
        type: Number,
        required: true
    },
    botBPerBet: {
        type: Number,
        required: true
    },
    botCPerBet: {
        type: Number,
        required: true
    },
    ethLimitFee: {
        type: Number,
        required: true
    },
    bscLimitFee: {
        type: Number,
        required: true
    },
    tronLimitFee: {
        type: Number,
        required: true
    },
    pumpingLimitTarget: {
        type: Number,
        required: true
    },
    pumpingLimitAmount: {
        type: Number,
        required: true
    },
    cardGameGreaterMultipler: {
        type: Number,
        required: true
    },
    cardGameLesserMultipler: {
        type: Number,
        required: true
    },
    cardGameEqualMultipler: {
        type: Number,
        required: true
    },
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);