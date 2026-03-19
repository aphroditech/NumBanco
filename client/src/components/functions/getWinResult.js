const PRIZE_MAP = {
    betOne:   "1st",
    betTwo:   "2nd",
    betThree: "3rd",
    betFour:  "4th",
    betFive:  "5th",
    betSix:   "6th"
};

export const getWinResult = (betResult, myUserId) => {
    if (!betResult) {
        return {
            isWinner: false,
            prizes: []
        };
    }

    const prizes = [];

    Object.entries(PRIZE_MAP).forEach(([betKey, place]) => {
        const winners = betResult[betKey]?.winUserId || [];
        if (winners.includes(myUserId)) {
            prizes.push(place);
        }
    });

    return {
        isWinner: prizes.length > 0,
        prizes // e.g. ["1st", "4th"]
    };
};
