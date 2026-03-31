import mongoose from 'mongoose';

const rangeMultiplierSchema = new mongoose.Schema(
    {
        minMultiplier: { type: Number, required: true },
        maxMultiplier: { type: Number, required: true },
        probability: { type: Number, required: true },
    },
    { _id: false },
);

const rangeMultipleTierSchema = new mongoose.Schema(
    {
        minAmount: { type: Number, required: true },
        maxAmount: { type: Number, required: true },
        multipliers: {
            type: [rangeMultiplierSchema],
            default: [],
        },
    },
    { _id: false },
);

const rangeSettingsSchema = new mongoose.Schema(
    {
        botWinningProbability: {
            type: Number,
            required: true,
            default: 0.5,
        },
        botTriggerProbability: {
            type: Number,
            required: true,
            default: 0.4,
        },
        limitNormalToHard: {
            type: Number,
            required: true,
            default: 1.2,
        },
        limitHardToNormal: {
            type: Number,
            required: true,
            default: 0.7,
        },
        multiple: {
            type: [rangeMultipleTierSchema],
            default: [],
        },
    },
    { timestamps: true },
);

export default mongoose.models.RangeSettings || mongoose.model('RangeSettings', rangeSettingsSchema);
