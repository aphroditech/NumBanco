import Amount from '../models/Amount.js';

export const initializeAmount = async () => {
    try {
        // Initialize Amount document if it doesn't exist
        const existingAmount = await Amount.findOne();
        if (!existingAmount) {
            const defaultAmount = new Amount({
                withdraw: 5000,
                partner: 100,
                reward: 100,
                defaultMembership: {
                    plus: 29,
                    pro: 59
                },
                decreaseMembership: { plus: 1, pro: 10 },
                decreases: false
            });
            await defaultAmount.save();
            console.log('✅ Default Amount document created');
        } else {
            console.log('✅ Amount document already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing Amount:', error);
    }
};
