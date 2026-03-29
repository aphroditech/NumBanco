import ClimbSettings from "../../models/ClimbSettings.js";

/** Columns per mode (grid width only; odds use `starRates`). */
export const CLIMB_MODE_COLS = { easy: 5, normal: 3, hard: 2 };

export const DEFAULT_CLIMB_SETTINGS = {
    easy: {
        multipliers: [1.10, 1.25, 1.40, 1.60, 2.00],
        starRates: [0.75, 0.62, 0.50, 0.38, 0.28],
    },
    normal: {
        multipliers: [1.15, 1.35, 1.65, 2.10, 3.00],
        starRates: [0.62, 0.5, 0.38, 0.28, 0.2],
    },
    hard: {
        multipliers: [1.20, 1.50, 2.00, 3.00, 5.00],
        starRates: [0.60, 0.45, 0.32, 0.20, 0.12],
    },
};

function normalizeMode(modeKey, rawMode, fallbackMode) {
    const src = Array.isArray(rawMode?.multipliers) ? rawMode.multipliers : fallbackMode.multipliers;
    const multipliers = src
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, 5);
    const multOut =
        multipliers.length === 5 ? multipliers : [...fallbackMode.multipliers];

    let starRates = Array.isArray(rawMode?.starRates)
        ? rawMode.starRates
              .map((n) => Number(n))
              .filter((n) => Number.isFinite(n))
              .slice(0, 5)
        : [];

    if (starRates.length !== 5) {
        starRates = [...fallbackMode.starRates];
    }

    starRates = starRates.map((r) => Math.min(1, Math.max(0, r)));
    if (starRates.length !== 5) {
        starRates = [...fallbackMode.starRates];
    }

    return { multipliers: multOut, starRates };
}

function normalize(raw) {
    return {
        easy: normalizeMode("easy", raw?.easy, DEFAULT_CLIMB_SETTINGS.easy),
        normal: normalizeMode("normal", raw?.normal, DEFAULT_CLIMB_SETTINGS.normal),
        hard: normalizeMode("hard", raw?.hard, DEFAULT_CLIMB_SETTINGS.hard),
    };
}

export async function getClimbSettingsMerged() {
    const doc =
        (await ClimbSettings.findById("global").lean()) ||
        (await ClimbSettings.findOne({}).sort({ updatedAt: -1, createdAt: -1 }).lean());
    return normalize(doc || DEFAULT_CLIMB_SETTINGS);
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/**
 * RealView `result` must be 0 (bust) or one of the step multipliers for that round's mode
 * (easy / normal / hard ladders from merged settings).
 */
export function normalizeClimbViewResult(modeKey, result, merged) {
    const m = String(modeKey || "easy").toLowerCase();
    const mode = m === "normal" || m === "hard" ? m : "easy";
    const r = Number(result);
    if (!Number.isFinite(r) || r <= 0) return 0;
    const fallback = DEFAULT_CLIMB_SETTINGS[mode];
    const rawList = merged?.[mode]?.multipliers;
    const list = Array.isArray(rawList) && rawList.length > 0 ? rawList.map((x) => Number(x)) : [...fallback.multipliers];
    const hit = list.find((x) => Math.abs(x - r) < 1e-4);
    if (hit != null) return round2(hit);
    return round2(list.reduce((best, x) => (Math.abs(x - r) < Math.abs(best - r) ? x : best), list[0]));
}
