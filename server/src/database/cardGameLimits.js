import CardGameLimit from '../models/CardGameLimit.js';

export const initializeCardGameLimits = async () => {
  try {
    const count = await CardGameLimit.countDocuments();

    if (count === 0) {
      await CardGameLimit.insertMany([
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
