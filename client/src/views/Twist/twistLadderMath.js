/** Keep in sync with server/src/services/twist/twistPlayLogic.js */

export const TWIST_GREEN_MULTS = [1.6, 5.0, 10.5, 18];
export const TWIST_ORANGE_MULTS = [2.5, 8.0, 16.5, 28.5, 45.0, 66];
export const TWIST_PURPLE_MULTS = [4, 13, 28.5, 35.0, 88.0, 137.5, 205.0];

export function multValueForCount(mults, count) {
    const c = Math.floor(Number(count)) || 0;
    if (c <= 0) return 0;
    return mults[(c - 1) % mults.length];
}

export function twistTotalMultiplierSum(purpleCount, orangeCount, greenCount) {
    return (
        multValueForCount(TWIST_PURPLE_MULTS, purpleCount) +
        multValueForCount(TWIST_ORANGE_MULTS, orangeCount) +
        multValueForCount(TWIST_GREEN_MULTS, greenCount)
    );
}

/** Index in ladder array for a spin multiplier (for wheel sector highlight). */
export function multIndexInLadder(mults, mult) {
    const m = Number(mult);
    const i = mults.findIndex((x) => Math.abs(x - m) < 0.02);
    return i >= 0 ? i : 0;
}
