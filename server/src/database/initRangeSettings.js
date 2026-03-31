import RangeSettings from '../models/range/RangeSettings.js';

export const initRangeSettings = async () => {
    try {
        // Initialize RangeSettings document if it doesn't exist
        const existingRangeSettings = await RangeSettings.findOne();
        if (!existingRangeSettings) {
            const defaultRangeSettings = new RangeSettings({
                botWinningProbability: 0.5,
                botTriggerProbability: 0.4,
                limitNormalToHard: 1.2,
                limitHardToNormal: 0.7,
                multiple: [{ minAmount: 0.5, maxAmount: 20, multipliers: [{ minMultiplier: 1, maxMultiplier: 5, probability: 0.5 }] }]
            });
            await defaultRangeSettings.save();
            console.log('✅ Default RangeSettings document created');
        } else {
            console.log('✅ RangeSettings document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing RangeSettings:', error);
    }
};
