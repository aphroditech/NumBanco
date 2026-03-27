import TwistSettings from "../../models/TwistSettings.js";
import { TWIST_SYMBOL_WEIGHTS } from "./twistPlayLogic.js";

export const DEFAULT_TWIST_SETTINGS = {
    easy: {
        // Easier mode: higher chance of color hits, lower mouse reset risk.
        pRate: 10,
        oRate: 16,
        gRate: 16,
        mouseRate: 8,
        stoneRate: 46,
    },
    normal: {
        pRate: Number(TWIST_SYMBOL_WEIGHTS.purple) || 0,
        oRate: Number(TWIST_SYMBOL_WEIGHTS.orange) || 0,
        gRate: Number(TWIST_SYMBOL_WEIGHTS.green) || 0,
        mouseRate: Number(TWIST_SYMBOL_WEIGHTS.mouse) || 0,
        stoneRate: Number(TWIST_SYMBOL_WEIGHTS.stone) || 0,
    },
    hard: {
        // Hard mode: lower color-hit chance, higher mouse reset risk.
        pRate: 4,
        oRate: 8,
        gRate: 8,
        mouseRate: 32,
        stoneRate: 44,
    },
};

function sanitizeRate(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
}

function normalizeModeRates(rawMode, fallbackMode) {
    const merged = {
        pRate: sanitizeRate(rawMode?.pRate, fallbackMode.pRate),
        oRate: sanitizeRate(rawMode?.oRate, fallbackMode.oRate),
        gRate: sanitizeRate(rawMode?.gRate, fallbackMode.gRate),
        mouseRate: sanitizeRate(rawMode?.mouseRate, fallbackMode.mouseRate),
        stoneRate: sanitizeRate(rawMode?.stoneRate, fallbackMode.stoneRate),
    };
    const total =
        merged.pRate +
        merged.oRate +
        merged.gRate +
        merged.mouseRate +
        merged.stoneRate;
    if (total <= 0) return { ...fallbackMode };
    return merged;
}

function clampAndNormalize(raw) {
    return {
        easy: normalizeModeRates(raw?.easy, DEFAULT_TWIST_SETTINGS.easy),
        normal: normalizeModeRates(raw?.normal, DEFAULT_TWIST_SETTINGS.normal),
        hard: normalizeModeRates(raw?.hard, DEFAULT_TWIST_SETTINGS.hard),
    };
}

export async function getTwistSettingsMerged() {
    // Support both the intended `_id: "global"` row and legacy ObjectId rows.
    const doc =
        (await TwistSettings.findById("global").lean()) ||
        (await TwistSettings.findOne({}).sort({ updatedAt: -1, createdAt: -1 }).lean());
    return clampAndNormalize(doc || DEFAULT_TWIST_SETTINGS);
}

export function getTwistRatesForMode(settings, modeRaw) {
    const mode = Number(modeRaw);
    const safe = settings || DEFAULT_TWIST_SETTINGS;
    if (mode === 0) return safe.easy || DEFAULT_TWIST_SETTINGS.easy;
    if (mode === 2) return safe.hard || DEFAULT_TWIST_SETTINGS.hard;
    return safe.normal || DEFAULT_TWIST_SETTINGS.normal;
}

