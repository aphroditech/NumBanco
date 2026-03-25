import mongoose from 'mongoose';
import Amount from '../models/Amount.js';
import dotenv from 'dotenv';

dotenv.config();

const initAmount = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/num2bet');
    console.log('Connected to MongoDB');

    // Check if Amount document already exists
    const existingAmount = await Amount.findOne();
    if (existingAmount) {
      console.log('Amount document already exists:', existingAmount);
      await mongoose.disconnect();
      return;
    }

    // Create default Amount document
    const defaultAmount = new Amount({
      withdraw: 5000,
      partner: 100,
      reward: 100
    });

    await defaultAmount.save();
    console.log('Default Amount document created:', defaultAmount);

  } catch (error) {
    console.error('Error initializing Amount:', error);
  } finally {
    await mongoose.disconnect();
  }
};

initAmount();
