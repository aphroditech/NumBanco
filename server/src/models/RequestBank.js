import mongoose from "mongoose";

const requestBankSchema = new mongoose.Schema({
    dailyTankAddress: {
        type: String,
        required: true
    },
    dailyTankPrivateKey: {
        type: String,
        required: true
    },
    dailyTankAmount: {
        type: Number,
        required: true
    },
    bankAddress: {
        type: String,
        required: true
    },
    transactionHash: {
        type: String
    },
    chain: {
        type: String,
        required: true
    },
    active: {
        type: Number,
        required: true
    },
    createAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('RequestBank', requestBankSchema);