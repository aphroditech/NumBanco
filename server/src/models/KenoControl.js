import mongoose from "mongoose";

const KenoControlSchema = new mongoose.Schema({
    numbersLength: {
        type: Number,
        required: true
    },
    low: {
        type: [
            {
                winLength: Number,
                probability: Number,
                multiplier: Number,
            }
        ],
        default: []
    },
    classic: {
        type: [
            {
                winLength: Number,
                probability: Number,
                multiplier: Number,
            }
        ],
        default: []
    },
    medium: {
        type: [
            {
                winLength: Number,
                probability: Number,
                multiplier: Number,
            }
        ],
        default: []
    },
    high: {
        type: [
            {
                winLength: Number,
                probability: Number,
                multiplier: Number,
            }
        ],
        default: []
    }
}, { timestamps: true });

export default mongoose.model('KenoControl', KenoControlSchema);