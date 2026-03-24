import JokerCrashPercentage from '../models/JokerCrashPercentage.js';

export const initializeJokerCrashPercentages = async () => {
  try {
    const count = await JokerCrashPercentage.countDocuments();

    if (count === 0) {
      await JokerCrashPercentage.insertMany([
        { card: 1, greater: 12/13*100, equal: 1/13*100, lesser: 0/13*100 },
        { card: 2, greater: 11/13*100, equal: 1/13*100, lesser: 1/13*100 },
        { card: 3, greater: 10/13*100, equal: 1/13*100, lesser: 2/13*100 },
        { card: 4, greater: 9/13*100, equal: 1/13*100, lesser: 3/13*100 },
        { card: 5, greater: 8/13*100, equal: 1/13*100, lesser: 4/13*100 },
        { card: 6, greater: 7/13*100, equal: 1/13*100, lesser: 5/13*100 },
        { card: 7, greater: 6/13*100, equal: 1/13*100, lesser: 6/13*100 },
        { card: 8, greater: 5/13*100, equal: 1/13*100, lesser: 7/13*100 },
        { card: 9, greater: 4/13*100, equal: 1/13*100, lesser: 8/13*100 },
        { card: 10, greater: 3/13*100, equal: 1/13*100, lesser: 9/13*100 },
        { card: 11, greater: 2/13*100, equal: 1/13*100, lesser: 10/13*100 },
        { card: 12, greater: 1/13*100, equal: 1/13*100, lesser: 11/13*100 },
        { card: 13, greater: 0/13*100, equal: 1/13*100, lesser: 12/13*100 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Joker Crash Percentages:', error);
  }
};
