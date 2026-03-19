import cron from 'node-cron';
import { checkExpiredDeposits } from '../controllers/watchDepositController.js';
import DailyTank from '../models/DailyTank.js';
import FeeTank from '../models/FeeTank.js';
import WithdrawDailyTank from '../models/WithdrawDailyTank.js';
import RubicResult from '../models/RubicResult.js';
import { generateETHWallet, generateTRONWallet, generateBSCWallet } from "./walletGenerator.js";
import User from '../models/User.js';
import "dotenv/config";

const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatLocalDateTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${formatLocalDate(date)} ${hours}:${minutes}:${seconds}`;
};

// Schedule the expired deposit check to run every 30 seconds
// This ensures deposits are marked as failed promptly after their 1-minute timeout
const expiredDepositJob = cron.schedule('*/30 * * * * *', async () => {
    // console.log('🕐 Running expired deposit check...');
    await checkExpiredDeposits();
}, {
    scheduled: false // Don't start immediately, we'll start it manually
});

// Function to start the cron job
export const startCronJobs = () => {
    // console.log('🚀 Starting cron jobs...');
    expiredDepositJob.start();
    // console.log('✅ Expired deposit checker started (runs every 30 seconds)');
    try {
        dailyTankJob.start();
        withdrawDailyTankJob.start();
        job.start();
        // console.log('✅ DailyTank creation job started (runs daily at 22:00)');
        // console.log('✅ WithdrawDailyTank creation job started (runs daily at 22:00)');
    } catch (err) {
        console.warn('Could not start DailyTank jobs:', err);
    }
};

// Create WithdrawDailyTank document for today's date using manager wallets from env
async function createWithdrawDailyTankEntry() {
    try {
        // Set all existing tanks to inactive first
        await WithdrawDailyTank.updateMany(
            { active: { $ne: 0 } },
            { active: 0 }
        );
        console.log('✅ Set all existing WithdrawDailyTank entries to inactive');

        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Set to start of day

        // Create new tank with active: 1 and when set to tomorrow
        const withdrawDailyTank = new WithdrawDailyTank({
            eth: generateETHWallet(),
            bsc: generateBSCWallet(),
            tron: generateTRONWallet(),
            active: 1,
            when: tomorrow,
        });

        await withdrawDailyTank.save();
        console.log('✅ New WithdrawDailyTank entry created with active: 1 and when:', formatLocalDateTime(tomorrow));
    } catch (err) {
        console.error('❌ Failed to create WithdrawDailyTank entry:', err);
    }
}

// Function to check and create yesterday's wallet if it doesn't exist
export async function ensureYesterdayWalletExists() {
    try {
        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday); // YYYY-MM-DD format (local)
        
        // Get today's date
        const today = new Date();
        const todayStr = formatLocalDate(today); // YYYY-MM-DD format (local)
        
        console.log(`🔍 Checking wallet status for dates: yesterday=${yesterdayStr}, today=${todayStr}`);
        
        // Check if there's already an active wallet
        const activeWithdrawTank = await WithdrawDailyTank.findOne({ active: 1 });
        
        console.log(`📊 Current active wallets:`);
        console.log(`   - Active WithdrawDailyTank: ${activeWithdrawTank ? 'YES' : 'NO'}`);
        
        if (activeWithdrawTank) {
            // Check if when field exists and is valid
            if (!activeWithdrawTank.when) {
                console.log(`❌ Active WithdrawDailyTank has no 'when' field, creating new wallet for today`);
                await WithdrawDailyTank.updateOne(
                    { _id: activeWithdrawTank._id },
                    { active: 0 }
                );
                
                const newWithdrawDailyTank = new WithdrawDailyTank({
                    eth: generateETHWallet(),
                    bsc: generateBSCWallet(),
                    tron: generateTRONWallet(),
                    active: 1,
                    createAt: new Date(todayStr + 'T12:00:00.000'),
                    when: new Date(todayStr + 'T12:00:00.000')
                });
                await newWithdrawDailyTank.save();
                console.log(`✅ Created and activated new WithdrawDailyTank for today (${todayStr})`);
                return;
            }
            
            const tankDate = formatLocalDate(new Date(activeWithdrawTank.when));
            console.log(`📅 Active WithdrawDailyTank created on: ${tankDate}`);
            
            // If active wallet is from today, do nothing
            if (tankDate === todayStr) {
                console.log(`✅ Active WithdrawDailyTank is from today (${todayStr}), no action needed`);
            } 

            // If active wallet is from an older date, create new one for today
            else {
                console.log(`🔄 Active WithdrawDailyTank is from older date (${tankDate}), creating new wallet for today`);
                await WithdrawDailyTank.updateOne(
                    { _id: activeWithdrawTank._id },
                    { active: 0 }
                );
                
                const newWithdrawDailyTank = new WithdrawDailyTank({
                    eth: generateETHWallet(),
                    bsc: generateBSCWallet(),
                    tron: generateTRONWallet(),
                    active: 1,
                    createAt: new Date(todayStr + 'T12:00:00.000'),
                    when: new Date(todayStr + 'T12:00:00.000')
                });
                await newWithdrawDailyTank.save();
                console.log(`✅ Created and activated new WithdrawDailyTank for today (${todayStr})`);
            }
        } else {
            // No active wallet exists, create one for today
            console.log(`❌ No active WithdrawDailyTank found, creating new wallet for today`);
            const newWithdrawDailyTank = new WithdrawDailyTank({
                eth: generateETHWallet(),
                bsc: generateBSCWallet(),
                tron: generateTRONWallet(),
                active: 1,
                createAt: new Date(todayStr + 'T12:00:00.000'),
                when: new Date(todayStr + 'T12:00:00.000')
            });
            await newWithdrawDailyTank.save();
            console.log(`✅ Created and activated new WithdrawDailyTank for today (${todayStr})`);
        }
        
        console.log(`🎉 Wallet management completed`);
        console.log(`🎯 Strategy: Only one active wallet per type, based on creation date`);
        
    } catch (error) {
        console.error('❌ Error ensuring yesterday\'s wallet exists:', error);
        // throw error;
        return;
    }
}

export async function resetDailyWithdraw() {
    console.log(123);
    try {
        const result = await User.updateMany(
            {}, // Update all documents
            { $set: { dailyWithdraw: 0 } } // Set dailyWithdraw to 0
        );
        
        console.log(`[${formatLocalDateTime(new Date())}] Reset dailyWithdraw for ${result.modifiedCount} users`);
        return result;
    } catch (error) {
        console.error('Error resetting dailyWithdraw:', error);
        // throw error;
        return;
    }
}

// Schedule WithdrawDailyTank creation at 22:00 every day (server local time)
const withdrawDailyTankJob = cron.schedule('0 22 * * *', async () => {
    console.log('🕘 Running WithdrawDailyTank creation job (22:00)');
    await createWithdrawDailyTankEntry();
}, {
    scheduled: false
});

// Schedule DailyTank creation at 22:00 every day (server local time)
const dailyTankJob = cron.schedule('0 22 * * *', async () => {
    console.log('🕘 Running DailyTank creation job (22:00)');
}, {
    scheduled: false
});

export { dailyTankJob, withdrawDailyTankJob };

const job = cron.schedule('0 0 * * *', async () => {
    console.log('Running daily withdraw reset job...');
    await resetDailyWithdraw();
});


/**
 * Starts the scheduled job to reset dailyWithdraw at midnight
 */
// export function startDailyWithdrawResetJob() {
//     // Schedule job to run every day at midnight (00:00)
//     // Cron format: minute hour day-of-month month day-of-week
//     // '0 0 * * *' means at minute 0 of hour 0, every day
//     , {
//         scheduled: false, // Don't start immediately
//         timezone: 'UTC' // Use UTC timezone
//     });

//     // Start the job
//     job.start();
    
//     console.log('Daily withdraw reset job scheduled to run at midnight UTC every day');
    
//     return job;
// }

/**
 * Manually trigger the daily withdraw reset (for testing or manual execution)
 */
export async function triggerDailyWithdrawReset() {
    console.log('Manually triggering daily withdraw reset...');
    return await resetDailyWithdraw();
}


// Function to stop the cron job
export const stopCronJobs = () => {
    console.log('🛑 Stopping cron jobs...');
    expiredDepositJob.stop();
    dailyTankJob.stop();
    withdrawDailyTankJob.stop();
    job.stop();
    console.log('✅ Expired deposit checker stopped');
    console.log('✅ DailyTank job stopped');
    console.log('✅ WithdrawDailyTank job stopped');
};

// Export the job instance if you need to control it individually
export { expiredDepositJob };
