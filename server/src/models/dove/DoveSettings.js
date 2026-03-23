import mongoose from 'mongoose';

const DoveSettingsSchema = new mongoose.Schema({
    RTP: {
        type: Number,
        required: true,
        default: 0.9
    },
    probability: {
        type: [
            {
                min: Number,
                max: Number,
                times: Number  // times * probability of winning for bets in this range
            }
        ],
        default: [
            { min: 0.1, max: 1000, times: 1 }
        ]
    },
    easy: {
        type: {
            a: Number,
            b: Number,
        },
        default: {
            a: 0.2,
            b: 0.05
        }
    },
    med: {
        type: {
            a: Number,
            b: Number,
        },
        default: {
            a: 0.15,
            b: 0.03
        }
    },
    hard: {
        type: {
            a: Number,
            b: Number,
        },
        default: {
            a: 0.1,
            b: 0.02
        }
    },
    ace: {
        type: {
            a: Number,
            b: Number,
        },
        default: {
            a: 0.08,
            b: 0.01
        }
    }
});

export default mongoose.model('DoveSettings', DoveSettingsSchema);