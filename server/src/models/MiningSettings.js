import mongoose from "mongoose";

const MiningSettingsSchema = new mongoose.Schema({
    limitHardToNormal: {
        type: Number,
        default: 0.6
    },
    limitNormalToHard: {
        type: Number,
        default: 1.2
    },
    botWinProbability: {
        type: Number,
        default: 0.55
    },
    botTriggerProbability: {
        type: Number,
        default: 0.4
    },
    Turns8: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 20, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turns7: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turns6: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turns5: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turns4: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turns3: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turns2: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
    Turn1: {
        type: [
            {
                max: Number,
                min: Number,
                totalNumber: Number,
                canWinNumber: Number,
            }
        ],
        default: [{ max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1 }]
    },
}, { timestamps: true });

export default mongoose.model('MiningSettings', MiningSettingsSchema);