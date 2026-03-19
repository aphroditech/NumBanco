import WatchDeposit from '../models/WatchDeposit.js';
import User from '../models/User.js';
import { createAblyClient } from '../config/ably.js';

const ably = createAblyClient();
const channel = ably.channels.get('deposits');

export const checkExpiredDeposits = async () => {
    try {
        const now = new Date();
        
        // Find all watch deposits that have expired
        const expiredWatchDeposits = await WatchDeposit.find({
            maxTime: { $lt: now }
        });

        for (const watchDeposit of expiredWatchDeposits) {
            try {
                // Find the user and update the deposit status to failed
                const user = await User.findOne({ 
                    userAuthId: watchDeposit.owner,
                    'deposit._id': watchDeposit.depId
                },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    password: 0,
                    country: 0,
                    pumpingMode: 0,
                    rubicMode: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    canWithdraw: 0,
                }
            );

                if (user) {
                    // Update the specific deposit to failed
                    await User.updateOne(
                        { 
                            userAuthId: watchDeposit.owner,
                            'deposit._id': watchDeposit.depId
                        },
                        { 
                            $set: { 'deposit.$.depFill': 'failed' }
                        }
                    );

                    // Publish to Ably channel
                    await channel.publish('deposit-failed', {
                        userId: watchDeposit.owner,
                        depositId: watchDeposit.depId,
                        watchDepositId: watchDeposit._id
                    });

                    console.log(`Deposit ${watchDeposit.depId} marked as failed for user ${watchDeposit.owner}`);
                }

                // Delete the watch deposit record
                await WatchDeposit.deleteOne({ _id: watchDeposit._id });

            } catch (error) {
                console.error(`Error processing expired deposit ${watchDeposit._id}:`, error);
            }
        }

        if (expiredWatchDeposits.length > 0) {
            console.log(`Processed ${expiredWatchDeposits.length} expired deposits`);
        }

    } catch (error) {
        console.error('Error checking expired deposits:', error);
    }
};

// Export for use in cron job or scheduled task
export default { checkExpiredDeposits };
