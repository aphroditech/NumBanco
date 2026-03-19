import mongoose from "mongoose";

const successDepositSchema = new mongoose.Schema({
    transactionHash: {
        type: String,
        required: true
    },
    blockNumber: {
        type: String,
        required: true
    },
    chain: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    coin: {
        type: String,
        required: true,
        default: 'USDT'
    },
    userId: {
        type: String,
        required: true
    },
    createAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('SuccessDeposit', successDepositSchema);