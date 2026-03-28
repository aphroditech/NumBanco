import WheelSettings from "../models/Wheel/wheelSettings.js";

export const initWheelSettings = async () => {
    try {
        const existing = await WheelSettings.findOne();
        if (!existing) {
            const defaultWheelSettings = new WheelSettings({
                botWinProbability: 0.5,
                botTriggerProbability: 0.4,
                limitNormalToHard: 1.2,
                limitHardToNormal: 0.7,
                low: [{multiplier: 1.48, probability: 10, totalNumber: 10, canWinNumber: 3}, {multiplier: 1.18, probability: 40, totalNumber: 10, canWinNumber: 1}, {multiplier: 0.00, probability: 50, totalNumber: 10, canWinNumber: 0}],
                medium: [{multiplier: 1.18, probability: 20, totalNumber: 10, canWinNumber: 1}, {multiplier: 1.68, probability: 10, totalNumber: 10, canWinNumber: 1}, {multiplier: 1.97, probability: 10, totalNumber: 10, canWinNumber: 1}, {multiplier: 2.96, probability: 3.3, totalNumber: 10, canWinNumber: 0}, {multiplier: 3.95, probability: 3.3, totalNumber: 10, canWinNumber: 0}, {multiplier: 0.00, probability: 53.3, totalNumber: 10, canWinNumber: 10}],
                hard: [{multiplier: 29.4, probability: 3.3, totalNumber: 10, canWinNumber: 1}, {multiplier: 0.00, probability: 96.7, totalNumber: 10, canWinNumber: 10}]
            });
            await defaultWheelSettings.save();
            console.log("✅ Default WheelSettings document created");
        } else {
            console.log("✅ WheelSettings document already exists");
        }
    } catch (error) {
        console.error("❌ Error initializing WheelSettings:", error);
    }
};
