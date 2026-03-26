import GravityBot from "../models/gravity/GravityBot.js";

export const initGravityBot = async () => {
    try {
        const existing = await GravityBot.findOne();
        if (!existing) {
            const defaultGravityBot = new GravityBot({
                enabled: true,
                upBotsMin: 5,
                upBotsMax: 10,
                upBetMinAmount: 5,
                upBetMaxAmount: 20,
                downBotsMin: 6,
                downBotsMax: 20,
                downBetMinAmount: 2,
                downBetMaxAmount: 30,
            });
            await defaultGravityBot.save();
            console.log("✅ Default GravityBot document created");
        } else {
            const $set = {};
            if (existing.upBotsMin == null) $set.upBotsMin = 5;
            if (existing.upBotsMax == null) $set.upBotsMax = 10;
            if (existing.upBetMinAmount == null) $set.upBetMinAmount = 5;
            if (existing.upBetMaxAmount == null) $set.upBetMaxAmount = 20;
            if (existing.downBotsMin == null) $set.downBotsMin = 6;
            if (existing.downBotsMax == null) $set.downBotsMax = 20;
            if (existing.downBetMinAmount == null) $set.downBetMinAmount = 2;
            if (existing.downBetMaxAmount == null) $set.downBetMaxAmount = 30;
            if (Object.keys($set).length > 0) {
                await GravityBot.updateOne({ _id: existing._id }, { $set });
                console.log("✅ GravityBot backfilled range fields:", Object.keys($set).join(", "));
            } else {
                console.log("✅ GravityBot document already exists");
            }
        }
    } catch (error) {
        console.error("❌ Error initializing GravityBot:", error);
    }
};
