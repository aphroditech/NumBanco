import MiningSettings from '../models/MiningSettings.js';

export const initMiningSetting = async () => {
    try {
        // Initialize MiningSettings document if it doesn't exist
        const existingMiningSettings = await MiningSettings.findOne();
        if (!existingMiningSettings) {
            const defaultMiningSettings = new MiningSettings({
                limitHardToNormal: 0.6,
                limitNormalToHard: 1.2,
                botWinProbability: 0.55,
                botTriggerProbability: 0.4,
                eightTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                sevenTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                sixTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                fiveTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                fourTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                threeTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                twoTurns: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}],
                oneTurn: [{max: 1.2, min: 0.5, totalNumber: 10, canWinNumber: 1}]
            });
            await defaultMiningSettings.save();
            console.log('✅ Default MiningSettings document created');
        } else {
            console.log('✅ MiningSettings document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing MiningSettings:', error);
    }
};
