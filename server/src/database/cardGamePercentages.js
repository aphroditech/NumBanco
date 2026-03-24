import CardGamePercentage from '../models/CardGamePercentage.js';

export const initializeCardGamePercentages = async () => {
  try {
    const count = await CardGamePercentage.countDocuments();

    if (count === 0) {
      await CardGamePercentage.insertMany([
        { arrow: '>', easy: 75, normal: 65, hard: 55 },
        { arrow: '=', easy: 8, normal: 6, hard: 4 },
        { arrow: '<', easy: 15, normal: 12, hard: 9 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing CardGame Percentages:', error);
  }
};
