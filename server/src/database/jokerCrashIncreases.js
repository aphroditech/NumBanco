import JokerCrashIncrease from '../models/JokerCrashIncrease.js';

export const initializeJokerCrashIncreases = async () => {
  try {
    const count = await JokerCrashIncrease.countDocuments();

    if (count === 0) {
      await JokerCrashIncrease.insertMany([
        { increase: 12, easy: 8.9, normal: 8.9, hard: 8.9 },
        { increase: 11, easy: 7.7, normal: 7.7, hard: 7.7 },
        { increase: 10, easy: 6.6, normal: 6.6, hard: 6.6 },
        { increase: 9, easy: 5.6, normal: 5.6, hard: 5.6 },
        { increase: 8, easy: 4.7, normal: 4.7, hard: 4.7 },
        { increase: 7, easy: 3.9, normal: 3.9, hard: 3.9 },
        { increase: 6, easy: 3.2, normal: 3.2, hard: 3.2 },
        { increase: 5, easy: 2.6, normal: 2.6, hard: 2.6 },
        { increase: 4, easy: 2.1, normal: 2.1, hard: 2.1 },
        { increase: 3, easy: 1.7, normal: 1.7, hard: 1.7 },
        { increase: 2, easy: 1.4, normal: 1.4, hard: 1.4 },
        { increase: 1, easy: 1.2, normal: 1.2, hard: 1.2 },
        { increase: 0, easy: 1, normal: 1, hard: 1 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Joker Crash Increases:', error);
  }
};
