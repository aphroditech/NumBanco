/**
 * Synthetic Twist outcomes for RealView bots.
 * bet: stake, result: multiplier, win: bet * result.
 */

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

const MULTI_POOL = [
    { m: 0, w: 26 },
    { m: 1.5, w: 22 },
    { m: 2.5, w: 18 },
    { m: 4, w: 14 },
    { m: 8, w: 9 },
    { m: 13, w: 6 },
    { m: 16.5, w: 4 },
    { m: 28.5, w: 3 },
    { m: 53, w: 2 },
    { m: 88, w: 1.5 },
    { m: 137.5, w: 0.8 },
    { m: 205, w: 0.4 },
];

function pickWeightedMultiplier() {
    const total = MULTI_POOL.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total;
    for (const { m, w } of MULTI_POOL) {
        r -= w;
        if (r <= 0) return m;
    }
    return MULTI_POOL[MULTI_POOL.length - 1].m;
}

export function calculateTwistBot() {
    const bet = round2(0.1 + Math.random() * (20 - 0.1));
    const result = pickWeightedMultiplier();
    const win = round2(bet * result);
    return { bet, result, win };
}

