import JokerCrashCard from '../models/JokerCrashCard.js';

export const initializeJokerCrashCards = async () => {
  try {
    const count = await JokerCrashCard.countDocuments();

    if (count === 0) {
      await JokerCrashCard.insertMany([
        { card: 1, greater: 1/13, equal: 12/13, lesser: 13/13 },
        { card: 2, greater: 2/13, equal: 12/13, lesser: 12/13 },
        { card: 3, greater: 3/13, equal: 12/13, lesser: 11/13 },
        { card: 4, greater: 4/13, equal: 12/13, lesser: 10/13 },
        { card: 5, greater: 5/13, equal: 12/13, lesser: 9/13 },
        { card: 6, greater: 6/13, equal: 12/13, lesser: 8/13 },
        { card: 7, greater: 7/13, equal: 12/13, lesser: 7/13 },
        { card: 8, greater: 8/13, equal: 12/13, lesser: 6/13 },
        { card: 9, greater: 9/13, equal: 12/13, lesser: 5/13 },
        { card: 10, greater: 10/13, equal: 12/13, lesser: 4/13 },
        { card: 11, greater: 11/13, equal: 12/13, lesser: 3/13 },
        { card: 12, greater: 12/13, equal: 12/13, lesser: 2/13 },
        { card: 13, greater: 13/13, equal: 12/13, lesser: 1/13 },
      ]);
    }
  } catch (error) {
    console.error('❌ Error initializing Joker Crash Cards:', error);
  }
};
