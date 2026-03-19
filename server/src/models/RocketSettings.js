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
    multiple: {
        type: [
            {
                number: Number,
                probability: Number
            }
        ],
        default: [{number: 0.5, probability: 0.5}]
    }
});

export default mongoose.model('RocketSettings', RocketSettingsSchema);