import ThreeNumbersPercentage from '../models/ThreeNumbersPercentage.js';

export const initializeThreeNumbersPercentages = async () => {
  try {
    const count = await ThreeNumbersPercentage.countDocuments();

    console.log(count);
    if (count === 0) {
      await ThreeNumbersPercentage.insertMany([
        { string: '.', first: 0, second: 40, third: 0 },
        { string: '0', first: 75, second: 50, third: 54 },
        { string: '1', first: 10, second: 10, third: 10 },
        { string: '2', first: 5, second: 0, third: 8 },
        { string: '3', first: 2, second: 0, third: 7 },
        { string: '4', first: 2, second: 0, third: 6 },
        { string: '5', first: 2, second: 0, third: 5 },
        { string: '6', first: 1, second: 0, third: 4 },
        { string: '7', first: 1, second: 0, third: 3 },
        { string: '8', first: 1, second: 0, third: 2 },
        { string: '9', first: 1, second: 0, third: 1 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing ThreeNumbers Percentages:', error);
  }
};
