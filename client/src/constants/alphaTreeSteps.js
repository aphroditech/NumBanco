/**
 * Must match server `server/src/constants/alphaTreeSteps.js`.
 * Steps 2–9: random permutation of bust / (0,1) / (1,max) across the 3 letters. Step 10: Z, fixed 0.6×2^9.
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
