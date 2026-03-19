import mongoose from "mongoose";

const dailyLootSchema = new mongoose.Schema({
   userName: {
        type: String,
    },
    lootAmt: {
        type: Number,
    },
    userId: { type: String },
}, { timestamps: true });

export default mongoose.model('DailyLoot', dailyLootSchema);