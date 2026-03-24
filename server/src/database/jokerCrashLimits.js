import JokerCrashLimit from '../models/JokerCrashLimit.js';

export const initializeJokerCrashLimits = async () => {
  try {
    const count = await JokerCrashLimit.countDocuments();

    if (count === 0) {
      await JokerCrashLimit.insertMany([
        { from: 0, to: 10, limitHard: 1, limitNormal: 0 },
        { from: 10, to: 100, limitHard: 10, limitNormal: 0 },
        { from: 100, to: 1000, limitHard: 100, limitNormal: 0 },
        { from: 1000, to: 10000, limitHard: 1000, limitNormal: 0 },
        { from: 10000, to: 100000, limitHard: 10000, limitNormal: 0 },
        { from: 100000, to: 1000000, limitHard: 100000, limitNormal: 0 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Pumping Limits:', error);
  }
};
