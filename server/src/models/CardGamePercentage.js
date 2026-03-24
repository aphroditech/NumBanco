import mongoose from "mongoose";

const CardGamePercentageSchema = new mongoose.Schema({
    arrow: {
        type: String,
        enum: ['<', '=', '>'],
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

export default mongoose.model('CardGamePercentage', CardGamePercentageSchema);