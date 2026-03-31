import mongoose from "mongoose";

const CryptoCrashLimitSchema = new mongoose.Schema({
    from: {
        type: Number,
        required: true
    },
    to: {
        type: Number,
        required: true
    },
    limitHard: {
        type: Number,
        required: true
    },
    limitNormal: {
        type: Number,
        required: true
    },
});

export default mongoose.model("CryptoCrashLimit", CryptoCrashLimitSchema);    