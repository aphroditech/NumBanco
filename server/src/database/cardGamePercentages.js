import CardGamePercentage from '../models/CardGamePercentage.js';

export const initializeCardGamePercentages = async () => {
  try {
    const count = await CardGamePercentage.countDocuments();

    if (count === 0) {
      await CardGamePercentage.insertMany([
        { arrow: '>', easy: 60, normal: 60, hard: 50 },
        { arrow: '=', easy: 57, normal: 57, hard: 48 },
        { arrow: '<', easy: 54, normal: 54, hard: 46 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing CardGame Percentages:', error);
  }
};
