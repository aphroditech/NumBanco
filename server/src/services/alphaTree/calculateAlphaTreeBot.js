/**
 * Synthetic Alpha Tree outcomes for RealView bots (same shape as real cash-out / bust rows).
 * bet: stake, result: total cumulative ×, win: profit (negative on bust).
 */

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/** Weighted random multipliers (typical early cash-outs vs rare big runs). */
const MULTI_POOL = [
    { m: 0.6, w: 12 },
    { m: 0.85, w: 14 },
    { m: 1.2, w: 14 },
    { m: 2.5, w: 12 },
    { m: 6, w: 10 },
    { m: 18, w: 8 },
    { m: 55, w: 6 },
    { m: 180, w: 4 },
    { m: 800, w: 3 },
    { m: 3500, w: 2 },
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

export function calculateAlphaTreeBot() {
    const bet = round2(0.1 + Math.random() * (20 - 0.1));

    // ~38% bust → result 0, lose stake (matches aggressive feel of tree)
    if (Math.random() < 0.38) {
        return {
            bet,
            result: 0,
            win: 0,
        };
    }

    const result = round2(pickWeightedMultiplier() * (0.85 + Math.random() * 0.3));
    const win = round2(bet * result);

    return { bet, result, win };
}
