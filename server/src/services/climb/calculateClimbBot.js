/**
 * Climb RealView bot: result is 0 (bust-like) or one multiplier from easy / normal / hard ladder.
 */

import { DEFAULT_CLIMB_SETTINGS } from "./climbSettings.service.js";

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

const MODES = ["easy", "normal", "hard"];

/** @param merged - output of `getClimbSettingsMerged()` */
export function calculateClimbBot(merged) {
    const bet = round2(0.1 + Math.random() * (20 - 0.1));
    const settings = merged || {
        easy: DEFAULT_CLIMB_SETTINGS.easy,
        normal: DEFAULT_CLIMB_SETTINGS.normal,
        hard: DEFAULT_CLIMB_SETTINGS.hard,
    };

    if (Math.random() < 0.28) {
        const mode = MODES[Math.floor(Math.random() * MODES.length)];
        return { bet, result: 0, win: 0, mode };
    }

    const mode = MODES[Math.floor(Math.random() * MODES.length)];
    const list = settings[mode]?.multipliers?.length
        ? settings[mode].multipliers.map((x) => Number(x))
        : [...DEFAULT_CLIMB_SETTINGS[mode].multipliers];
    const result = Number(list[Math.floor(Math.random() * list.length)]);
    const win = round2(bet * result);
    return { bet, result, win, mode };
}
