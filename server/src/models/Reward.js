import mongoose from "mongoose";

const RewardSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    rwAmt: {
        type: Number,
    },
    userId: { 
        type: String, 
        required: true 
    },
}, { timestamps: true });

export default mongoose.model('Reward', RewardSchema);