import SnakesSetting from '../models/snakes/SnakesSettings.js';

export const initializeSnakesSettings = async () => {
    try {
        // Initialize Rubic Settings document if it doesn't exist
        const existingSnakesSettings = await SnakesSetting.findOne();
        if (!existingSnakesSettings) {
            const defaultSnakesSettings = new SnakesSetting({
                botWinningProbability: 0.5,
                botTriggerProbability: 0.4,
                step1: [
                    {
                        sum: 7,
                        probabililty: [
                            {
                                easy: 0.5,
                                medium: 0.3,
                                hard: 0.2,
                            }
                        ]
                    }
                ],
                step2: [
                    {
                        sum: 7,
                        probabililty: [
                            {
                                easy: 0.5,
                                medium: 0.3,
                                hard: 0.2,
                            }
                        ]
                    }
                ],
                step3: [
                    {
                        sum: 7,
                        probabililty: [
                            {
                                easy: 0.5,
                                medium: 0.3,
                                hard: 0.2,
                            }
                        ]
                    }
                ],
                step4: [
                    {
                        sum: 7,
                        probabililty: [
                            {
                                easy: 0.5,
                                medium: 0.3,
                                hard: 0.2,
                            }
                        ]
                    }
                ],
                step5: [
                    {
                        sum: 7,
                        probabililty: [
                            {
                                easy: 0.5,
                                medium: 0.3,
                                hard: 0.2,
                            }
                        ]
                    }
                ]
            });
            await defaultSnakesSettings.save();
            console.log('✅ Default Snakes Settings document created');
        } else {
            console.log('✅ Snakes Settings document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing Snakes Settings:', error);
    }
};
