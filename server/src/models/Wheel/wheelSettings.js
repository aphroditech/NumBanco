import mongoose from 'mongoose';

const wheelSettingsSchema = new mongoose.Schema({
    botWinningProbability: {
        type: Number,
        default: 0.5,
    },
    botTriggerProbability: {
        type: Number,
        default: 0.4,
    },
    limitNormalToHard: {
        type: Number,
        default: 1.2,
    },
    limitHardToNormal: {
        type: Number,
        default: 0.7,
    },
    low: {
       type: [
            {
                multiplier: Number,
                probability: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }        
       ],
       default: [
        {
            multiplier: 1.48,
            probability: 10,
            totalNumber: 10,
            canWinNumber: 3,
        },
        {
            multiplier: 1.18,
            probability: 40,
            totalNumber: 10,
            canWinNumber: 1,
        },
        {
            multiplier: 0.00,       
            probability: 50,
            totalNumber: 10,
            canWinNumber: 0,
        }
       ]
    },
    medium: {
        type: [
            {
                multiplier: Number,
                probability: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }        
       ],
       default: [
        {
            multiplier: 1.48,
            probability: 20,
            totalNumber: 10,
            canWinNumber: 1,
        },
        {
            multiplier: 1.68,
            probability: 10,
            totalNumber: 10,
            canWinNumber: 1,
        },
        {
            multiplier: 1.97,
            probability: 10,
            totalNumber: 10,
            canWinNumber: 1,
        },
        {
            multiplier: 2.96,
            probability: 3.3,
            totalNumber: 10,
            canWinNumber: 0,
        },
        {
            multiplier: 3.95,
            probability: 3.3,
            totalNumber: 10,
            canWinNumber: 0,
        },
        {
            multiplier: 0.00,
            probability: 53.3,
            totalNumber: 10,
            canWinNumber: 10,
        },
    ]
    },
    hard: {
        type: [
            {
                multiplier: Number,
                probability: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }        
       ],
       default: [
        {
            multiplier: 29.4,
            probability: 3.3,
            totalNumber: 10,
            canWinNumber: 1,
        },
        {
            multiplier: 0.00,
            probability: 96.7,
            totalNumber: 10,
            canWinNumber: 10,
        },
    ]
    },
});

export default mongoose.model('WheelSettings', wheelSettingsSchema);