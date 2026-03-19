import GravityBot from '../models/GravityBot.js';

export const initializeGravityBot = async () => {
    try {
        // Initialize Amount document if it doesn't exist
        const existingGravityBot = await GravityBot.findOne();
        if (!existingGravityBot) {
            const defaultGravityBot = new GravityBot({
                totalBots: 10,
                betsPerSecond: 2,
                upRatio: 0.5,
                downRatio: 0.5, 
                minBet: 5,
                maxBet: 25,
                chanceToBet: 0.75
            });
            await defaultGravityBot.save();
            console.log('✅ Default GravityBot document created');
        } else {
            console.log('✅ GravityBot document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing Amount:', error);
    }
};
