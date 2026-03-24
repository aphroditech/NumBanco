/**
 * Step 1: A → fixed 0.6.
 * Steps 2–9: three letters per step. On each pick, the server assigns bust (0), (0.1,1), and (1, max)
 * to the three letters (each band exactly once). P(clicked letter gets high) is configurable.
 * Step 10: only Z → fixed multiplier 0.6 × 2^9 by default, or random (high / mid / bust) if `zButtonHighRate` is set.
 */
export const ALPHA_TREE_STEP_LETTERS = [
    ["A"],
    ["B", "C", "D"],
    ["E", "F", "G"],
    ["H", "I", "J"],
    ["K", "L", "M"],
    ["N", "O", "P"],
    ["Q", "R", "S"],
    ["T", "U", "V"],
    ["W", "X", "Y"],
    ["Z"],
];

export function allowedLettersForStep(step, phase) {
    if (phase === "await_cashout") return [];
    if (phase === "await_a" && step === 1) return ALPHA_TREE_STEP_LETTERS[0];
    if (phase === "playing" && step >= 2 && step <= 10) {
        return ALPHA_TREE_STEP_LETTERS[step - 1] || [];
    }
    return [];
}
