import CoinSettings from "../models/coin/CoinSettings.js";

export const initCoinSettings = async () => {
    try {
        const existing = await CoinSettings.findOne();
        if (!existing) {
            const defaultCoinSettings = new CoinSettings({
                botWinProbability: 0.5,
                botTriggerProbability: 0.4,
                limitNormalToHard: 1.2,
                limitHardToNormal: 0.7,
                multiple: [{min: 0.5, max: 20, probability: 0.5, totalNumber: 10, canWinNumber: 1}]
            });
            await defaultCoinSettings.save();
            console.log("✅ Default CoinSettings document created");
        } else {
            console.log("✅ CoinSettings document already exists");
        }
    } catch (error) {
        console.error("❌ Error initializing CoinSettings:", error);
    }
};
