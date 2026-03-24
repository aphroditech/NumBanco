import mongoose from "mongoose";

const CocoViewSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    bet: { 
        type: Number,
        required: true
    },
    win: {
        type: Number,
        required: true
    },
    result: {
        type: Number,
        required: true
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

CocoViewSchema.index({ createdAt: -1 });
CocoViewSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('CocoView', CocoViewSchema);