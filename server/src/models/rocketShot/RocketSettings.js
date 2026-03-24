import mongoose from "mongoose";
const RocketSettingsSchema = new mongoose.Schema({
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
    normalMultiple: {
        type: [
            {
                number: Number,
                probability: Number
            }
        ],
        default: [{number: 0.5, probability: 5}]
    },
    hardMultiple: {
        type: [
            {
                number: Number,
                probability: Number
            }
        ],
        default: [{number: 1, probability: 5}]
    }
});

export default mongoose.model('RocketSettings', RocketSettingsSchema);