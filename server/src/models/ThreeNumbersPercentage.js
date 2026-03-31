import mongoose from "mongoose";

const ThreeNumbersPercentageSchema = new mongoose.Schema({
    string: {
        type: String,
        required: true
    },
    first: {
        type: Number,
        required: true
    },
    second: {
        type: Number,
        required: true
    },
    third: {
        type: Number,
        required: true
    },
});

export default mongoose.model("ThreeNumbersPercentage", ThreeNumbersPercentageSchema);    