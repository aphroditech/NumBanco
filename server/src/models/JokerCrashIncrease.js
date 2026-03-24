import mongoose from "mongoose";

const JokerCrashIncreaseSchema = new mongoose.Schema({
    increase: {
        type: Number,
        required: true
    },
    easy: {
        type: Number,
        default: 0
    },
    normal: {
        type: Number,
        default: 0
    },
    hard: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

export default mongoose.model('JokerCrashIncrease', JokerCrashIncreaseSchema);