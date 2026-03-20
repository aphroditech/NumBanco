export const calculateCoco = () => {

    // bet 0.2 - 20
    const bet = Number((Math.random() * 19.8 + 0.2).toFixed(2));

    let winRate = 0;
    let maxMulti = 2;

    // ✅ bet range rate
    if (bet < 1) {
        winRate = 0.7;
        maxMulti = 2;
    } 
    else if (bet < 5) {
        winRate = 0.55;
        maxMulti = 3.5;
    } 
    else {
        winRate = 0.35;
        maxMulti = 6;
    }

    // multiplier pool
    const multiPool = [
        { value: 0.5, rate: 20 },
        { value: 1.05, rate: 20 },
        { value: 1.2, rate: 15 },
        { value: 1.35, rate: 15 },
        { value: 1.5, rate: 10 },
        { value: 2.0, rate: 10 },
        { value: 4 + Math.random() * 2, rate: 10 }, // 3.5–6
    ];

    // filter by maxMulti
    const allowed = multiPool.filter(m => m.value <= maxMulti);

    // weighted random
    const totalRate = allowed.reduce((a, b) => a + b.rate, 0);
    let r = Math.random() * totalRate;

    let multi = 1;

    for (const m of allowed) {
        if (r < m.rate) {
            multi = Number(m.value.toFixed(2));
            break;
        }
        r -= m.rate;
    }

    // win or lose
    const isWin = Math.random() < winRate;

    const target = Number((bet * multi).toFixed(2));

    const result = isWin
        ? target
        : Number((Math.random() * target).toFixed(2));

    const win = isWin ? target : 0;

    return {
        bet,
        multi,
        target,
        result,
        win,
    };
};