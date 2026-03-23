import AToZSetting from '../models/AToZSetting.js';

export const initAToZSetting = async () => {
    try {
        // Initialize MiningSettings document if it doesn't exist
        const existingAToZSetting = await AToZSetting.findOne();
        if (!existingAToZSetting) {
            const defaultAToZSetting = new AToZSetting({
                botWiningProbability: 0.6,
                botTriggerProbability: 0.4,
                limitNormalToHard: 1.3,
                limitHardToNormal: 0.7,
                THREE_ORDERED: {
                    multiplier: 800,
                    probability: 0
                },
                THREE_UNORDERED: {
                    multiplier: 150,
                    probability: 0
                },
                TWO_ORDERED: {
                    multiplier: 15,
                    probability: 0.01
                },
                TWO_UNORDERED: {
                    multiplier: 7.2,
                    probability: 0.04
                },
                ONE_ORDERED: {
                    multiplier: 2.4,
                    probability: 0.18
                },
                ONE_UNORDERED: {
                    multiplier: 1.2,
                    probability: 0.32
                },
                NONE: {
                    multiplier: 0.1,
                    probability: 0.45
                }
            });
            await defaultAToZSetting.save();
            console.log('✅ Default AToZSetting document created');
        } else {
            console.log('✅ AToZSetting document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing AToZSetting:', error);
    }
};
