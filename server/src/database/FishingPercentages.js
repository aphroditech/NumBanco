import FishingPercentage from '../models/FishingPercentage.js';

export const initializeFishingPercentages = async () => {
  try {
    const count = await FishingPercentage.countDocuments();

    if (count === 0) {
      await FishingPercentage.insertMany([
        { step: 1, easy: 70, normal: 60, hard: 50 },
        { step: 2, easy: 65, normal: 57, hard: 48 },
        { step: 3, easy: 60, normal: 54, hard: 46 },
        { step: 4, easy: 55, normal: 51, hard: 44 },
        { step: 5, easy: 50, normal: 48, hard: 42 },
        { step: 6, easy: 45, normal: 45, hard: 40 },
        { step: 7, easy: 40, normal: 42, hard: 38 },
        { step: 8, easy: 35, normal: 39, hard: 32 },
        { step: 9, easy: 30, normal: 36, hard: 30 },
        { step: 10, easy: 25, normal: 33, hard: 28 }
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Fishing Percentages:', error);
  }
};
