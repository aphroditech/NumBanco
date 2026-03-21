import RocketSettings from '../models/RocketSettings.js';

export const initRocketSetting = async () => {
    try {
        // Initialize MiningSettings document if it doesn't exist
        const existingRocketSettings = await RocketSettings.findOne();
        if (!existingRocketSettings) {
            const defaultRocketSettings = new RocketSettings({
                botWinProbability: 0.5,
                botTriggerProbability: 0.4,
                limitNormalToHard: 1.2,
                limitHardToNormal: 0.7,
                normalMultiple: [{number: 0.5, probability: 5}],
                hardMultiple: [{number: 1, probability: 5}],
            });
            await defaultRocketSettings.save();
            console.log('✅ Default RocketSettings document created');
        } else {
            console.log('✅ RocketSettings document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing RocketSettings:', error);
    }
};
