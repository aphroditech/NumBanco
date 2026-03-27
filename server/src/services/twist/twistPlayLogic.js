import crypto from "node:crypto";

/** Multiplier ladders: index advances only when that jewel tier hits again. */
export const TWIST_GREEN_MULTS = [1.6, 5.0, 10.5, 18];
export const TWIST_ORANGE_MULTS = [2.5, 8.0, 16.5, 28.5, 45.0, 66];
export const TWIST_PURPLE_MULTS = [4, 13, 28.5, 35.0, 88.0, 137.5, 205.0];

export const TWIST_SYMBOLS = ["purple", "orange", "green", "stone", "mouse"];

/**
 * Relative hit rates per symbol (any positive numbers; ratios matter, not the sum).
 * Tune for house edge / UX: e.g. more stone = calmer ladder, more mouse = volatile resets.
 * Server-only — the client must never choose the outcome.
 */
export const TWIST_SYMBOL_WEIGHTS = {
    purple: 6,
    orange: 12,
    green: 12,
    stone: 48,
    mouse: 18,
};

function pickWeightedSymbol(weights) {
    const entries = Object.entries(weights).filter(([, w]) => Number(w) > 0);
    const total = entries.reduce((sum, [, w]) => sum + Number(w), 0);
    if (total <= 0) {
        return TWIST_SYMBOLS[Math.floor(Math.random() * TWIST_SYMBOLS.length)];
    }
    let roll = crypto.randomInt(0, total);
    for (const [symbol, w] of entries) {
        const wi = Number(w);
        if (roll < wi) return symbol;
        roll -= wi;
    }
    return entries[entries.length - 1][0];
}

export function pickTwistSymbol(weights = TWIST_SYMBOL_WEIGHTS) {
    return pickWeightedSymbol(weights);
}

function decClamp(n) {
    return Math.max(0, n - 1);
}

/** Ladder multiplier for `count` completed hits on that tier (1 → first value, 0 → 0). */
export function multValueForCount(mults, count) {
    const c = Math.floor(Number(count)) || 0;
    if (c <= 0) return 0;
    return mults[(c - 1) % mults.length];
}

/** Sum of purple + orange + green ladder values at stored hit counts (e.g. 1,2,3 → 4+8+10.5). */
export function twistTotalMultiplierSum(purpleCount, orangeCount, greenCount) {
    return (
        multValueForCount(TWIST_PURPLE_MULTS, purpleCount) +
        multValueForCount(TWIST_ORANGE_MULTS, orangeCount) +
        multValueForCount(TWIST_GREEN_MULTS, greenCount)
    );
}

/**
 * @param {object} state — twistGreenMultIndex, twistOrangeMultIndex, twistPurpleMultIndex (non-negative ints)
 * @returns {{ symbol: string, multiplier: number, twistGreenMultIndex: number, twistOrangeMultIndex: number, twistPurpleMultIndex: number }}
 */
export function resolveTwistSpin(state, symbolOverride = null) {
    const symbol = symbolOverride || pickTwistSymbol();
    let g = Number(state.twistGreenMultIndex) || 0;
    let o = Number(state.twistOrangeMultIndex) || 0;
    let p = Number(state.twistPurpleMultIndex) || 0;
    let multiplier;

    if (symbol === "green") {
        multiplier = TWIST_GREEN_MULTS[g % TWIST_GREEN_MULTS.length];
        g += 1;
    } else if (symbol === "orange") {
        multiplier = TWIST_ORANGE_MULTS[o % TWIST_ORANGE_MULTS.length];
        o += 1;
    } else if (symbol === "purple") {
        multiplier = TWIST_PURPLE_MULTS[p % TWIST_PURPLE_MULTS.length];
        p += 1;
    } else if (symbol === "mouse") {
        multiplier = TWIST_GREEN_MULTS[0];
        g = decClamp(g);
        o = decClamp(o);
        p = decClamp(p);
    } else {
        // stone
        multiplier = TWIST_GREEN_MULTS[0];
    }

    return {
        symbol,
        multiplier,
        twistGreenMultIndex: g,
        twistOrangeMultIndex: o,
        twistPurpleMultIndex: p,
    };
}
