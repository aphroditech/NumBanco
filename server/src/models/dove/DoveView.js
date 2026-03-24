import mongoose from "mongoose";

const DoveViewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    bet: {
        type: Number,
        required: true
    },
    multiplier: {
        type: Number,
        required: true
    },
    win: {
        type: Number,
        required: true
    },
    expectedValue: {
        type: Number,
        default: 0
    },
    isUser: {
        type: Number,
        default: 0
    },
    time: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model("DoveView", DoveViewSchema);
