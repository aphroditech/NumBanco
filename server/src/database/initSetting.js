import Setting from '../models/Setting.js';

export const initializeSetting = async () => {
    try {
        // Initialize Setting document if it doesn't exist
        const existingSetting = await Setting.findOne();
        if (!existingSetting) {
            const defaultSetting = new Setting({
                confirmation: 5,
                pollTron: 5,
                confirmationTron: 5,
                fundMerge: 60,
                feeTank: 60,
                dailyTank: 60,
                ethLimit: 100,
                bscLimit: 100,
                tronLimit: 100,
                tronTransactionLimit: 100,
                botAPerBet: 5,
                botBPerBet: 5,
                botCPerBet: 5,
                ethLimitFee: 0.0001,
                bscLimitFee: 0.00001,
                tronLimitFee: 5,
                pumpingLimitTarget: 20,
                pumpingLimitAmount: 100,
            });
            await defaultSetting.save();
            console.log('✅ Default Setting document created');
        } else {
            console.log('✅ Setting document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing Setting:', error);
    }
};
