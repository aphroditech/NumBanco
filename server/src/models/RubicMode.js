import mongoose from "mongoose";

const RubicModeSchema = new mongoose.Schema({
    type: {
        type: String,
    },
    mode: {
        type: Number,
    },
}, { timestamps: true });

export default mongoose.model('RubicMode', RubicModeSchema);