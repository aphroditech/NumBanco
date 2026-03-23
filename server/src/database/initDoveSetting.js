import DoveSettings from '../models/dove/DoveSettings.js';

export const initDoveSetting = async () => {
    try {
        // Initialize DoveSettings document if it doesn't exist
        const existingDoveSettings = await DoveSettings.findOne();
        if (!existingDoveSettings) {
            const defaultDoveSettings = new DoveSettings({
                RTP: 0.9,
                probability: [
                    { min: 0.1, max: 1000, times: 1 }
                ],
                easy: { a: 0.08, b: 0.01 },
                med: { a: 0.1, b: 0.02 },
                hard: { a: 0.15, b: 0.03 },
                ace: { a: 0.3, b: 1 }
            });
            await defaultDoveSettings.save();
            console.log('✅ Default DoveSettings document created');
        } else {
            console.log('✅ DoveSettings document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing DoveSettings:', error);
    }
};
