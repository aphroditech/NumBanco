import mongoose from "mongoose";

const fundMergeSchema = new mongoose.Schema({
    depAddr: {
        type: String,
        required: true
    },
    depAmt: {
        type: Number,
        required: true
    },
    depNet: {
        type: String,
        required: true
    },
    depCoin: {
        type: String,
        required: true
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

export default mongoose.model('FundMerge', fundMergeSchema);