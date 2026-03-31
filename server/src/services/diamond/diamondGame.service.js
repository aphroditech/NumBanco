/**
 * Diamonds: board gem colors and layout per rate index.
 * Rates / weights live in DB (`DiamondSettings`); see `diamondSettings.service.js`.
 */

export const DIAMOND_COLOR_KEYS = ["blue", "green", "purple", "red", "yellow"];

const [C0, C1, C2, C3, C4] = DIAMOND_COLOR_KEYS;

/** Seven visual tiers (must match `DiamondSettings` tier count). */
const KEYS_BY_RATE_INDEX = [
    [C0, C1, C2, C3, C4],
    [C0, C0, C1, C2, C3],
    [C0, C0, C1, C1, C2],
    [C0, C0, C0, C1, C2],
    [C0, C0, C0, C1, C1],
    [C0, C0, C0, C0, C1],
    [C0, C0, C0, C0, C0],
];

/**
 * @param {number} rateIndex — 0 .. KEYS_BY_RATE_INDEX.length - 1
 * @returns {string[]}
 */
export function diamondKeysForRateIndex(rateIndex) {
    const i = Number(rateIndex);
    if (!Number.isInteger(i) || i < 0 || i >= KEYS_BY_RATE_INDEX.length) {
        return [...KEYS_BY_RATE_INDEX[0]];
    }
    return [...KEYS_BY_RATE_INDEX[i]];
}
