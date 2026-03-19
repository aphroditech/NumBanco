import RubicSetting from '../models/RubicSetting.js';

export const initializeRubicSettings = async () => {
    try {
        // Initialize Rubic Settings document if it doesn't exist
        const existingRubicSettings = await RubicSetting.findOne();
        if (!existingRubicSettings) {
            const defaultRubicSettings = new RubicSetting({
                limitHardToNormal: 0.5,
                botWinProbability: 0.55,
                botTriggerProbability: 0.4
            });
            await defaultRubicSettings.save();
            console.log('✅ Default Rubic Settings document created');
        } else {
            console.log('✅ Rubic Settings document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing Rubic Settings:', error);
    }
};
