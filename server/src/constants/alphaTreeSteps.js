/**
 * Step 1: A → fixed 0.6.
 * Steps 2–9: three letters per step. Each step, bust (0), (0.1,1), and (1, max) are assigned to the
 * three letters in a random order (max = 0.6 × 2^(step−1) for the high band).
 * Step 10: only Z → fixed multiplier 0.6 × 2^9.
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
