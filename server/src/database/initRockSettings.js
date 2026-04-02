import RockSettings from "../models/rock/rockSettings.js";

export const initRockSettings = async () => {
    try {
        const existing = await RockSettings.findOne();
        if (!existing) {
            const defaultRockSettings = new RockSettings({
                botWinProbability: 0.5,
                botTriggerProbability: 0.4,
                multiplier: [{ minAmount: 0.1, maxAmount: 2, RTPPercentage: 0.95 }, { minAmount: 2, maxAmount: 10, RTPPercentage: 0.85 }, { minAmount: 10, maxAmount: 20, RTPPercentage: 0.75 }]
            });
            await defaultRockSettings.save();
            console.log("✅ Default RockSettings document created");
        } else {
            console.log("✅ RockSettings document already exists");
        }
    } catch (error) {
        console.error("❌ Error initializing RockSettings:", error);
    }
};
