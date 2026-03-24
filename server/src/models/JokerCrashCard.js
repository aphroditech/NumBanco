import mongoose from "mongoose";

const JokerCrashCardSchema = new mongoose.Schema({
    card: {
        type: Number,
        required: true
    },
    greater: {
        type: Number,
        default: 0
    },
    equal: {
        type: Number,
        default: 0
    },
    lesser: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

export default mongoose.model('JokerCrashCard', JokerCrashCardSchema);