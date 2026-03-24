import mongoose from 'mongoose';

const RubicSettingSchema = new mongoose.Schema({
    times90: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number
            }
        ],
        default: [{min: 0.1, max: 1000, probability: 0.833}]
    },
    times125: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number,
                totalNumber: Number,
                winningNumber: Number
            }
        ],
        default: [{min: 0.1, max: 1000, probability: 0.666, totalNumber: 10, winningNumber: 1}]
    },
    times195: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number,
                totalNumber: Number,
                winningNumber: Number
            }
        ],
        default: [{min: 0.1, max: 1000, probability: 0.5, totalNumber: 10, winningNumber: 1}]
    },
    times250: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number,
                totalNumber: Number,
                winningNumber: Number
            }
        ],
        default: [{min: 0.1, max: 1000, probability: 0.333, totalNumber: 10, winningNumber: 1}]
    },
    times500: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number,
                totalNumber: Number,
                winningNumber: Number
            }
        ],
        default: [{min: 0.1, max: 1000, probability: 0.166, totalNumber: 10, winningNumber: 1}]
    },
    times1000: {
        type: [
            {
                min: Number,
                max: Number,
                probability: Number,
                totalNumber: Number,
                winningNumber: Number
            }
        ],
        default: [{min: 0.1, max: 1000, probability: 0.166, totalNumber: 10, winningNumber: 1}]
    },
    limitHardToNormal: {
        type: Number,
        default: 0.5
    },
    botWinProbability: {
        type: Number,
        default: 0.55
    },
    botTriggerProbability: {
        type: Number,
        default: 0.4
    },
    limitNormalToHard: {
        type: [
            {
                min: Number,
                max: Number,
                limitAmt: Number
            }
        ],  
        default: [{min: 0.1, max: 10, limitAmt: 30}]
    },
    
}, { timestamps: true });

export default mongoose.model('RubicSetting', RubicSettingSchema);