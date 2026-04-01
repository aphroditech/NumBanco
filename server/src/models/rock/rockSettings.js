import mongoose from 'mongoose';

const rockSettingsSchema = new mongoose.Schema({
    botWinProbability: {
        type: Number,
        default: 0.5
    },
    botTriggerProbability: {
        type: Number,
        default: 0.4
    },

    multiplier: {
        type: [
            {
                minAmount: Number,
                maxAmount: Number,
                RTPPercentage: Number,
            }
        ],
        default: [
            { minAmount: 0.1, maxAmount: 2, RTPPercentage: 0.95 },
            { minAmount: 2, maxAmount: 10, RTPPercentage: 0.85 },
            { minAmount: 10, maxAmount: 20, RTPPercentage: 0.75 },
        ]
    }
});

export default mongoose.model('RockSettings', rockSettingsSchema);