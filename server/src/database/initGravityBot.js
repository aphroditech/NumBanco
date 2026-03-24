import GravityBot from "../models/GravityBot.js";

export const initGravityBot = async () => {
    try {
        const existing = await GravityBot.findOne();
        if (!existing) {
            const defaultGravityBot = new GravityBot({
                enabled: true,
                totalBots: 6,
                betsPerSecond: 1,
                upRatio: 0.5,
                downRatio: 0.5,
                minBet: 0.1,
                maxBet: 5,
                chanceToBet: 0.8,
            });
            await defaultGravityBot.save();
            console.log("✅ Default GravityBot document created");
        } else {
            console.log("✅ GravityBot document already exists");
        }
    } catch (error) {
        console.error("❌ Error initializing GravityBot:", error);
    }
};
