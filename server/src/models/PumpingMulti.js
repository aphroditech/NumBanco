import mongoose from "mongoose";

const PumpingMultiSchema = new mongoose.Schema({
    from: {
        type: Number,
        required: true
    },
    to: {
        type: Number,
        required: true
    },
    min: {
        type: Number,
        required: true
    },
    max: {
        type: Number,
        required: true
    },
});

export default mongoose.model("PumpingMulti", PumpingMultiSchema);    