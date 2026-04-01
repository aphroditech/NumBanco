import CryptoCrashPercentage from '../models/CryptoCrashPercentage.js';

export const initializeCryptoCrashPercentages = async () => {
  try {
    const count = await CryptoCrashPercentage.countDocuments();

    if (count === 0) {
      await CryptoCrashPercentage.insertMany([
        { from: 0, to: 1, easy: 50, normal: 50, hard: 50 },
        { from: 1, to: 2, easy: 45, normal: 45, hard: 45 },
        { from: 2, to: 3, easy: 40, normal: 40, hard: 40 },
        { from: 3, to: 4, easy: 35, normal: 35, hard: 35 },
        { from: 4, to: 5, easy: 30, normal: 30, hard: 30 },
        { from: 5, to: 6, easy: 25, normal: 25, hard: 25 },
        { from: 6, to: 7, easy: 20, normal: 20, hard: 20 },
        { from: 7, to: 8, easy: 15, normal: 15, hard: 15 },
        { from: 8, to: 9, easy: 10, normal: 10, hard: 10 },
        { from: 9, to: 10, easy: 5, normal: 5, hard: 5 }
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing CryptoCrash Percentages:', error);
  }
};
