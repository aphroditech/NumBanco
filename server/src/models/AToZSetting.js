import mongoose from 'mongoose';

const wheelSettingsSchema = new mongoose.Schema({
    botWiningProbability: {
        type: Number,
        required: true,
        default: 0.6
    },
    botTriggerProbability: {
        type: Number,
        required: true,
        default: 0.3
    },
    limitNormalToHard: {
        type: Number,
        default: 1.3
    },
    limitHardToNormal: {
        type: Number,
        default: 0.7
    },
});

export default mongoose.model('WheelSettings', wheelSettingsSchema);