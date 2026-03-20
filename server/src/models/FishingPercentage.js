import mongoose from "mongoose";

const FishingPercentageSchema = new mongoose.Schema({
    step: {
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

export default mongoose.model("FishingPercentage", FishingPercentageSchema);    