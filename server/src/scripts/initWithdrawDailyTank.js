import mongoose from 'mongoose';
import WithdrawDailyTank from '../models/WithdrawDailyTank.js';
import dotenv from 'dotenv';
import { generateETHWallet, generateTRONWallet, generateBSCWallet } from '../utils/walletGenerator.js';

dotenv.config();

const initWithdrawDailyTank = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/num2bet');
    console.log('Connected to MongoDB');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Set to start of day

    // Check if ANY WithdrawDailyTank exists (not just yesterday's)
    const anyTank = await WithdrawDailyTank.findOne();
    if (anyTank) {
      console.log('WithdrawDailyTank already exists, skipping creation');
      await mongoose.disconnect();
      return;
    }

    // Create default WithdrawDailyTank for yesterday
    const defaultTank = new WithdrawDailyTank({
      createAt: yesterday,
      eth: generateETHWallet(),
      bsc: generateBSCWallet(),
      tron: generateTRONWallet(),
      active: 1,
      history: []
    });

    await defaultTank.save();
    console.log('WithdrawDailyTank created for yesterday:', defaultTank);

  } catch (error) {
    console.error('Error initializing WithdrawDailyTank:', error);
  } finally {
    await mongoose.disconnect();
  }
};

initWithdrawDailyTank();
