import ClimbSettings from "../../models/ClimbSettings.js";

/** Columns per mode — used for default banRate (1/cols matches legacy random-ban-column odds). */
export const CLIMB_MODE_COLS = { easy: 5, normal: 3, hard: 2 };

export const DEFAULT_CLIMB_SETTINGS = {
    easy: { multipliers: [1.1, 1.25, 1.35, 1.5, 2.0], banRate: 1 / CLIMB_MODE_COLS.easy },
    normal: { multipliers: [1.24, 1.37, 1.5, 2.12, 2.5], banRate: 1 / CLIMB_MODE_COLS.normal },
    hard: { multipliers: [1.5, 1.8, 2.0, 2.7, 3.0], banRate: 1 / CLIMB_MODE_COLS.hard },
};

function normalizeMode(modeKey, rawMode, fallbackMode) {
    const cols = CLIMB_MODE_COLS[modeKey] || 5;
    const src = Array.isArray(rawMode?.multipliers) ? rawMode.multipliers : fallbackMode.multipliers;
    const multipliers = src
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, 5);
    const multOut =
        multipliers.length === 5 ? multipliers : [...fallbackMode.multipliers];
    const defaultBan = Number.isFinite(Number(fallbackMode.banRate))
        ? Number(fallbackMode.banRate)
        : 1 / cols;
    let banRate = Number(rawMode?.banRate);
    if (!Number.isFinite(banRate)) {
        banRate = defaultBan;
    }
    banRate = Math.min(1, Math.max(0, banRate));
    return { multipliers: multOut, banRate };
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

