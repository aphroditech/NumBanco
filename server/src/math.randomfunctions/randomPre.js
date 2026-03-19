// preBot service
export const randomBetween = (x, y) => {
  return Math.floor(Math.random() * (y - x)) + x;
}

export const randomBetId = (betId) => {
    const randomLimited = 20+betId;
    const randomBetId = randomBetween(betId, randomLimited)+1;
    return randomBetId;
}

export const randomTicket = (membership) => {
    const tickets = {
        0: [1, 5, 5, 5, 5],
        1: [10, 50, 50, 50, 50],
        2: [50, 100, 100, 100, 100]
    };
    // const tickets = {
    //     0: [100, 100, 100, 100, 100, 100, 100],
    //     1: [100, 100, 100, 100, 100, 100, 100],
    //     2: [100, 100, 100, 100, 100, 100, 100]
    // };
    const arr = tickets[membership];
    if (!arr || !arr.length) return null;

    return arr[Math.floor(Math.random() * arr.length)];
}

export const getUniqueRandomNumbers = (x) => {
  const set = new Set();

  while (set.size < x) {
    set.add(Math.floor(Math.random() * 100) + 1);
  }

  return [...set];
}

export const randomIsPre = () => {
  const arr = [true, false, false, false, false, false, false, false, false, false];
  if (!arr || !arr.length) return null;

  return arr[Math.floor(Math.random() * arr.length)];
}

export const randomPreTurns = () => {
  const arr = [1, 1, 1, 1, 1, 1, 1, 2, 2, 3];
  if (!arr || !arr.length) return null;

  return arr[Math.floor(Math.random() * arr.length)];
}