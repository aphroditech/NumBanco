import mongoose from "mongoose";

const RubicModeSchema = new mongoose.Schema({
    type: {
        type: String,
        select: false
    },
    mode: {
        type: Number,
    },
}, { timestamps: true });

export default mongoose.model('RubicMode', RubicModeSchema);