// betBot service
export const getRandomNumbersExcludingY = (X, Y = []) => {
    // Ensure X is a positive integer
    if (!Number.isInteger(X) || X <= 0) {
        console.error("X must be a positive integer.");
        return [];
    }

    // Ensure Y is an array of positive integers
    if (!Array.isArray(Y)) {
        console.error("Y must be an array.");
        return [];
    }
    Y = Y.filter(num => Number.isInteger(num) && num > 0);

    // Step 1: Create an array of numbers from 1 to 100 excluding Y
    const allNumbers = Array.from({ length: 100 }, (_, i) => i + 1);
    let availableNumbers = allNumbers.filter(num => !Y.includes(num));

    // Step 2: If X > available numbers, adjust X
    if (X > availableNumbers.length) {
        // console.warn(`X=${X} is greater than available numbers. Reducing X to ${availableNumbers.length}`);
        X = availableNumbers.length;
    }

    // Step 3: Randomly pick X numbers
    const randomNumbers = [];
    for (let i = 0; i < X; i++) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        randomNumbers.push(availableNumbers[randomIndex]);
        availableNumbers.splice(randomIndex, 1); // remove to avoid duplicates
    }

    return randomNumbers;
};
export const divideXIntoRandomParts = (x, y) => {
    x <= 0 ? x = 1:x = x;
    if (y <= 0 || x <= 0) {
        console.error("X and Y must be positive integers.");
        return;
    }

    if (y > x) {
        console.error("Y cannot be greater than X.");
        return;
    }

    const result = [];
    let remainingValue = x;

    // Generate Y-1 random parts, each at least 1
    for (let i = 0; i < y - 1; i++) {
        // Generate random number between 1 and remainingValue - (y - i - 1)
        const randomPart = Math.floor(Math.random() * (remainingValue - (y - i - 1))) + 1;
        result.push(randomPart);
        remainingValue -= randomPart; // Decrease the remaining value
    }

    // The last part is the remaining value to ensure the sum equals X
    result.push(remainingValue);

    // Shuffle the result to randomize the distribution of numbers
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]]; // Swap
    }

    return result;
}

export const matchUsersToX = (users, X) => {
  return X.map((x, index) => {
    const eligibleUsers = users.filter(user => isEligible(user, x));

    if (eligibleUsers.length === 0) {
    //   throw new Error(`No eligible user found for X[${index}] = ${x}`);
    return;
    }

    // pick one (random or first — your choice)
    return eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
  });
}

export const isEligible = (user, x) => {
  if (user.membership === 0) return x < 5;
  if (user.membership === 1) return x < 50;
  if (user.membership === 2) return true;
  return false;
}

export const randomsoldticketsFunction = (num, zone, turn) => {
    if(zone == turn) {
        return 100-num;
    }
    return Math.floor(getRandomInt((100 / turn)*zone-num-Math.floor(getRandomInt(0, zone*(100 / turn)+10-num)/4), (100 / turn)*zone-num+Math.floor(getRandomInt(0, (100 / turn)*zone+10-num)/4))) + 1;
}

export const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const getRandomInts = (min, max, count) => {
    const randomNumbers = [];
    for (let i = 0; i < count; i++) {
        randomNumbers.push(getRandomInt(min, max));  // Generate each random integer
    }
    return randomNumbers;
}