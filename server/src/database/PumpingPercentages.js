import PumpingPercentage from '../models/PumpingPercentage.js';

export const initializePumpingPercentages = async () => {
  try {
    const count = await PumpingPercentage.countDocuments();

    if (count === 0) {
      await PumpingPercentage.insertMany([
        { from: 0, to: 1, easy: 1, normal: 1, hard: 1 },
        { from: 1, to: 1.05, easy: 12, normal: 12, hard: 35 },
        { from: 1.05, to: 2.05, easy: 33, normal: 33, hard: 45 },
        { from: 2.05, to: 2.5, easy: 35, normal: 45, hard: 18 },
        { from: 2.5, to: 5, easy: 15, normal: 5, hard: 0.5 },
        { from: 5, to: 10.05, easy: 2, normal: 2, hard: 0.3 },
        { from: 10.05, to: 50.05, easy: 1, normal: 1, hard: 0.2 },
        { from: 50.05, to: 100.05, easy: 0.6, normal: 0.6, hard: 0 },
        { from: 100.05, to: 300.05, easy: 0.3, normal: 0.3, hard: 0 },
        { from: 300.05, to: 1000, easy: 0.1, normal: 0.1, hard: 0 }
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Pumping Percentages:', error);
  }
};
