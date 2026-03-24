import mongoose from "mongoose";
const CoinSettingsSchema = new mongoose.Schema({
    botWinProbability: {
        type: Number,
        default: 0.5
    },
    botTriggerProbability: {
        type: Number,
        default: 0.4
    },
    limitNormalToHard: {
        type: Number,
        default: 1.2
    },
    limitHardToNormal: {
        type: Number,
        default: 0.7
    },
    multiple: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{min: 0.5, max: 20, probability: 0.5, totalNumber: 10, canWinNumber: 1}]
    },
});

export default mongoose.model('CoinSettings', CoinSettingsSchema);