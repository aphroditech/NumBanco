import RocketSettings from '../models/RocketSettings.js';

export const initRocketSetting = async () => {
    try {
        // Initialize MiningSettings document if it doesn't exist
        const existingRocketSettings = await RocketSettings.findOne();
        if (!existingRocketSettings) {
            const defaultRocketSettings = new RocketSettings({
                botWinProbability: 0.5,
                botTriggerProbability: 0.4,
                multiple: [{number: 0.5, probability: 0.5}]
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
