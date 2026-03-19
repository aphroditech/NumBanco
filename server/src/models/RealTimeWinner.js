import mongoose from 'mongoose';

const realTimeWinnerSchema = new mongoose.Schema({
    username: {
        type:  String,
    },
    level: {
        type: Number,
        require: true
    }, 
    earn: {
        type: Number,
        require: true,
    },
    betId: {
        type: Number,
    },
    avatar: {
        type: String
    },
    membership: {
        type: Number,
        default: 0
    },
    time: {
        type: Number
    }
}, { timestamps: true });
export default mongoose.model("realtime_winners", realTimeWinnerSchema);