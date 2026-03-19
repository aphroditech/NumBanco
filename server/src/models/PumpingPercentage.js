import mongoose from "mongoose";

const PumpingPercentageSchema = new mongoose.Schema({
    from: {
        type: Number,
        required: true
    },
    to: {
        type: Number,
        required: true
    },
    easy: {
        type: Number,
        required: true
    },
    normal: {
        type: Number,
        required: true
    },
    hard: {
        type: Number,
        required: true
    },
});

export default mongoose.model("PumpingPercentage", PumpingPercentageSchema);    