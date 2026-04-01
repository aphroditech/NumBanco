/**
 * Tarot three-card multiplier: base (center) × left × right. Weights define relative draw odds.
 */
import TarotSettings from "../../models/tarot/TarotSettings.js";

/**
 * Edit this object to control Tarot rates.
 * `rate` is the relative chance weight for each multiplier value.
 */
export const TAROT_MODE_KEYS = ["easy", "normal", "hard"];

const DEFAULT_NORMAL_BASE = [
    { value: 1.2, rate: 30 },
    { value: 1.5, rate: 25 },
    { value: 2.0, rate: 20 },
    { value: 3.0, rate: 15 },
    { value: 5.0, rate: 7 },
];

const DEFAULT_NORMAL_SIDE = [
    // Tuned to ~90% RTP with base table above (without 10x item).
    { value: 0, rate: 30.4 },
    { value: 0.5, rate: 28 },
    { value: 1.0, rate: 24 },
    { value: 1.5, rate: 12 },
    { value: 2.0, rate: 5.6 },
];

const DEFAULT_EASY_SIDE = DEFAULT_NORMAL_SIDE;
const DEFAULT_HARD_SIDE = DEFAULT_NORMAL_SIDE;

export const DEFAULT_TAROT_SETTINGS = {
    easy: { base: DEFAULT_NORMAL_BASE, side: DEFAULT_EASY_SIDE },
    normal: { base: DEFAULT_NORMAL_BASE, side: DEFAULT_NORMAL_SIDE },
    hard: { base: DEFAULT_NORMAL_BASE, side: DEFAULT_HARD_SIDE },
    revenueAutoMode: { normalBandMin: -20, normalBandMax: 20 },
};

function sanitizeRateRows(rows, fallbackRows) {
    if (!Array.isArray(rows) || rows.length === 0) return fallbackRows;
    const merged = rows.map((row, idx) => {
        const value = Number(row?.value);
        const rate = Number(row?.rate);
        const fallback = fallbackRows[idx];
        if (!Number.isFinite(value)) {
            return fallback || null;
        }
        if (!Number.isFinite(rate) || rate < 0) {
            return fallback || null;
        }
        return { value, rate };
    });
    const filtered = merged.filter(Boolean);
    const totalRate = filtered.reduce((sum, row) => sum + row.rate, 0);
    if (totalRate <= 0) return fallbackRows;
    return filtered;
}

function toWeightedTable(rows) {
    return rows.map((row) => ({ value: Number(row.value), weight: Number(row.rate) }));
}

function sanitizeRevenueBand(raw) {
    let lo = Number(raw?.normalBandMin);
    let hi = Number(raw?.normalBandMax);
    if (!Number.isFinite(lo)) lo = DEFAULT_TAROT_SETTINGS.revenueAutoMode.normalBandMin;
    if (!Number.isFinite(hi)) hi = DEFAULT_TAROT_SETTINGS.revenueAutoMode.normalBandMax;
    if (lo > hi) {
        const t = lo;
        lo = hi;
        hi = t;
    }
    return { normalBandMin: lo, normalBandMax: hi };
}

function normalizeModeBlock(raw, fallback) {
    return {
        base: sanitizeRateRows(raw?.base, fallback.base),
        side: sanitizeRateRows(raw?.side, fallback.side),
    };
}

async function loadAndEnsureTarotSettingsDoc() {
    const latest =
        (await TarotSettings.findById("global").lean()) ||
        (await TarotSettings.findOne({}).sort({ updatedAt: -1, createdAt: -1 }).lean());

    if (!latest) {
        await TarotSettings.create({ _id: "global", ...DEFAULT_TAROT_SETTINGS });
        return TarotSettings.findById("global").lean();
    }

    const hasModes =
        latest.easy?.base?.length &&
        latest.easy?.side?.length &&
        latest.normal?.base?.length &&
        latest.normal?.side?.length &&
        latest.hard?.base?.length &&
        latest.hard?.side?.length;

    if (hasModes && latest.revenueAutoMode) return latest;

    // Migration path: legacy `base/side` are treated as normal mode.
    const normalLegacy = {
        base: sanitizeRateRows(latest.base, DEFAULT_TAROT_SETTINGS.normal.base),
        side: sanitizeRateRows(latest.side, DEFAULT_TAROT_SETTINGS.normal.side),
    };
    const patch = {
        easy: normalizeModeBlock(latest.easy, DEFAULT_TAROT_SETTINGS.easy),
        normal: normalizeModeBlock(latest.normal, normalLegacy),
        hard: normalizeModeBlock(latest.hard, DEFAULT_TAROT_SETTINGS.hard),
        revenueAutoMode: sanitizeRevenueBand(latest.revenueAutoMode),
    };
    await TarotSettings.updateOne({ _id: "global" }, { $set: patch });
    return TarotSettings.findById("global").lean();
}

export async function getTarotSettingsMerged() {
    const doc = await loadAndEnsureTarotSettingsDoc();
    const legacyNormal = {
        base: sanitizeRateRows(doc?.base, DEFAULT_TAROT_SETTINGS.normal.base),
        side: sanitizeRateRows(doc?.side, DEFAULT_TAROT_SETTINGS.normal.side),
    };
    const useLegacyNormal =
        (Array.isArray(doc?.base) && doc.base.length > 0) ||
        (Array.isArray(doc?.side) && doc.side.length > 0);

    return {
        easy: normalizeModeBlock(doc?.easy, DEFAULT_TAROT_SETTINGS.easy),
        // Backward compatibility: if admins edit legacy `base/side` directly in DB,
        // treat them as live normal-mode rates.
        normal: useLegacyNormal ? legacyNormal : normalizeModeBlock(doc?.normal, DEFAULT_TAROT_SETTINGS.normal),
        hard: normalizeModeBlock(doc?.hard, DEFAULT_TAROT_SETTINGS.hard),
        revenueAutoMode: sanitizeRevenueBand(doc?.revenueAutoMode),
    };
}

export function getTarotModeLevelByRevenue(revenue, bands) {
    const b = sanitizeRevenueBand(bands);
    if (revenue < b.normalBandMin) return 0;
    if (revenue > b.normalBandMax) return 2;
    return 1;
}

export function getTarotModeKeyByLevel(level) {
    return TAROT_MODE_KEYS[Math.max(0, Math.min(2, Number(level) || 1))] || "normal";
}

export async function getTarotSettingsForClient() {
    const merged = await getTarotSettingsMerged();
    return {
        modes: {
            easy: merged.easy,
            normal: merged.normal,
            hard: merged.hard,
        },
        revenueAutoMode: merged.revenueAutoMode,
    };
}

export async function updateTarotSettings(patch) {
    const current = await getTarotSettingsMerged();
    const next = {
        easy: normalizeModeBlock(patch?.modes?.easy, current.easy),
        normal: normalizeModeBlock(patch?.modes?.normal, current.normal),
        hard: normalizeModeBlock(patch?.modes?.hard, current.hard),
        revenueAutoMode: sanitizeRevenueBand({
            normalBandMin:
                patch?.revenueAutoMode?.normalBandMin ?? current.revenueAutoMode.normalBandMin,
            normalBandMax:
                patch?.revenueAutoMode?.normalBandMax ?? current.revenueAutoMode.normalBandMax,
        }),
    };

    await TarotSettings.updateOne(
        { _id: "global" },
        {
            $set: {
                easy: next.easy,
                normal: next.normal,
                hard: next.hard,
                revenueAutoMode: next.revenueAutoMode,
            },
        },
        { upsert: true }
    );
    return getTarotSettingsForClient();
}

function tableWeightSum(table) {
    return table.reduce((s, r) => s + r.weight, 0);
}

/** @param {{ value: number, weight: number }[]} table */
export function weightedPick(table) {
    const sum = tableWeightSum(table);
    if (sum <= 0) return table[0];
    let x = Math.random() * sum;
    for (const row of table) {
        x -= row.weight;
        if (x <= 0) return row;
    }
    return table[table.length - 1];
}

export function ratePctForWeight(weight, table) {
    const sum = tableWeightSum(table);
    if (sum <= 0) return 0;
    return (weight / sum) * 100;
}

/**
 * @returns {{
 *   totalMult: number,
 *   base: { value: number, ratePct: number },
 *   left: { value: number, ratePct: number },
 *   right: { value: number, ratePct: number },
 * }}
 */
export async function sampleTarotRound(mode = "normal") {
    const settings = await getTarotSettingsMerged();
    const safeMode = TAROT_MODE_KEYS.includes(mode) ? mode : "normal";
    const baseTable = toWeightedTable(settings[safeMode].base);
    const sideTable = toWeightedTable(settings[safeMode].side);

    const b = weightedPick(baseTable);
    const l = weightedPick(sideTable);
    const r = weightedPick(sideTable);
    const totalMult = b.value * l.value * r.value;
    return {
        totalMult,
        base: {
            value: b.value,
            ratePct: ratePctForWeight(b.weight, baseTable),
        },
        left: {
            value: l.value,
            ratePct: ratePctForWeight(l.weight, sideTable),
        },
        right: {
            value: r.value,
            ratePct: ratePctForWeight(r.weight, sideTable),
        },
    };
}
