import PumpingMulti from '../models/PumpingMulti.js';

export const initializePumpingMultis = async () => {
  try {
    const count = await PumpingMulti.countDocuments();

    if (count === 0) {
      await PumpingMulti.insertMany([
        { from: 1, to: 1.01, min: 20, max: 35 },
        { from: 1.01, to: 1.05, min: 15, max: 20 },
        { from: 1.05, to: 1.2, min: 10, max: 15 },
        { from: 1.2, to: 1.5, min: 5, max: 10 },
        { from: 1.5, to: 2, min: 2, max: 5 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Pumping Multis:', error);
  }
};
