import mongoose from "mongoose";

const withdrawSchema = new mongoose.Schema({
    wdAddr: {
        type: String,
        required: true
    },
    wdAmount: {
        type: Number,
    },
    wdNet: {
        type: String,
        required: true
    },
    wdCoin: {
        type: String,
        required: true,
        default: 'USDT'
    },
    isAuth: {
        type: Boolean
    },
    createAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Withdraw', withdrawSchema);