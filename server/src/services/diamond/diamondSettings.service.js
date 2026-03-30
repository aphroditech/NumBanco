import DiamondSettings from "../../models/diamond/DiamondSettings.js";

export const DIAMOND_SETTINGS_ID = "global";

export const DIAMOND_MODE_KEYS = ["easy", "normal", "hard"];

/** Index: 0 easy, 1 normal, 2 hard — matches `user.diamondMode`. */
export const DIAMOND_MODE_BY_LEVEL = ["easy", "normal", "hard"];

/** Default revenue bands for automatic mode (inclusive normal window). */
export const DEFAULT_REVENUE_AUTO_MODE = {
    normalBandMin: -20,
    normalBandMax: 20,
};

/**
 * Shared payout multipliers for all modes — Normal defines the ladder; Easy/Hard reuse these rates.
 * When the DB `modes.normal` tiers are present, resolved normal tiers override these defaults.
 */
export const DIAMOND_CANONICAL_DEFAULT_RATES = [0, 0.2, 1.2, 2.5, 6, 15, 70];

/** Default relative weights per mode (only weights differ; rates come from normal). */
export const DEFAULT_WEIGHTS_BY_MODE = {
    easy: [0.22, 0.58, 0.12, 0.05, 0.025, 0.004, 0.001],
    normal: [0.15, 0.6, 0.12, 0.07, 0.03, 0.02, 0.01],
    hard: [0.1, 0.48, 0.18, 0.14, 0.06, 0.03, 0.01],
};

function zipRatesWithWeights(rates, weights) {
    return rates.map((rate, i) => ({
        rate,
        weight: weights[i],
    }));
}

const NORMAL_DEFS_DEFAULT = zipRatesWithWeights(
    DIAMOND_CANONICAL_DEFAULT_RATES,
    DEFAULT_WEIGHTS_BY_MODE.normal
);

/** Default tiers per mode when seeding MongoDB (rates identical; weights differ). */
export const DEFAULT_DIAMOND_MODE_TIERS = Object.fromEntries(
    DIAMOND_MODE_KEYS.map((k) => [
        k,
        zipRatesWithWeights(DIAMOND_CANONICAL_DEFAULT_RATES, DEFAULT_WEIGHTS_BY_MODE[k]),
    ])
);

/** @deprecated use DEFAULT_DIAMOND_MODE_TIERS.normal */
export const DEFAULT_DIAMOND_TIERS = DEFAULT_DIAMOND_MODE_TIERS.normal;

export function isDiamondMode(mode) {
    return DIAMOND_MODE_KEYS.includes(String(mode));
}

export function resolveRevenueAutoModeFromDoc(doc) {
    const r = doc?.revenueAutoMode;
    let min = Number(r?.normalBandMin);
    let max = Number(r?.normalBandMax);
    if (!Number.isFinite(min)) min = DEFAULT_REVENUE_AUTO_MODE.normalBandMin;
    if (!Number.isFinite(max)) max = DEFAULT_REVENUE_AUTO_MODE.normalBandMax;
    if (min > max) {
        const t = min;
        min = max;
        max = t;
    }
    return { normalBandMin: min, normalBandMax: max };
}

async function ensureRevenueAutoModePersisted(doc) {
    const r = doc?.revenueAutoMode;
    const minOk = Number.isFinite(Number(r?.normalBandMin));
    const maxOk = Number.isFinite(Number(r?.normalBandMax));
    if (minOk && maxOk) return doc;
    const patch = resolveRevenueAutoModeFromDoc(doc);
    await DiamondSettings.updateOne({ _id: DIAMOND_SETTINGS_ID }, { $set: { revenueAutoMode: patch } });
    return DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
}

/** Bands from DB (`revenueAutoMode`) or pass `{ normalBandMin, normalBandMax }` explicitly. */
export function getDiamondModeLevelByRevenue(revenue, bands) {
    const b = bands
        ? resolveRevenueAutoModeFromDoc({ revenueAutoMode: bands })
        : DEFAULT_REVENUE_AUTO_MODE;
    const lo = b.normalBandMin;
    const hi = b.normalBandMax;
    if (revenue < lo) return 0;
    if (revenue > hi) return 2;
    return 1;
}

function modeWeightDefaults(mode) {
    return DEFAULT_WEIGHTS_BY_MODE[isDiamondMode(mode) ? mode : "normal"];
}

/**
 * Align `modes.normal` tiers from DB: fill missing rate/weight from normal defaults.
 * @returns {{ rate, weight }[]}
 */
export function alignNormalTiersFromDb(tiers) {
    return NORMAL_DEFS_DEFAULT.map((def, i) => {
        const t = tiers?.[i];
        const rate = Number(t?.rate);
        const weight = Number(t?.weight);
        return {
            rate: Number.isFinite(rate) ? rate : def.rate,
            weight: Number.isFinite(weight) ? weight : def.weight,
        };
    });
}

/**
 * Apply normal's resolved rates to a mode row; weights from DB or mode defaults.
 */
export function buildModeTiersWithNormalRates(mode, tiersFromDb, canonicalRates) {
    const wDef = modeWeightDefaults(mode);
    return canonicalRates.map((rate, i) => {
        const tw = Number(tiersFromDb?.[i]?.weight);
        return {
            rate,
            weight: Number.isFinite(tw) ? tw : wDef[i],
        };
    });
}

/** Normalize weights to probabilities; keep rates as-is. */
export function normalizeTierWeightsOnly(tiers) {
    const rates = tiers.map((t) => Number(t.rate));
    const raw = tiers.map((t) => Math.max(0, Number(t.weight) || 0));
    const sum = raw.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
        const n = raw.length || 7;
        const w = 1 / n;
        return { rates, weights: rates.map(() => w) };
    }
    return { rates, weights: raw.map((w) => w / sum) };
}

/** @deprecated Prefer alignNormalTiersFromDb + buildModeTiersWithNormalRates */
export function alignDiamondTiersToSeven(tiers, defList) {
    const defs =
        Array.isArray(defList) && defList.length === 7 ? defList : NORMAL_DEFS_DEFAULT;
    return defs.map((def, i) => {
        const t = tiers?.[i];
        const rate = Number(t?.rate);
        const weight = Number(t?.weight);
        return {
            rate: Number.isFinite(rate) ? rate : def.rate,
            weight: Number.isFinite(weight) ? weight : def.weight,
        };
    });
}

export function normalizeDiamondTiers(tiers, defList) {
    const aligned = alignDiamondTiersToSeven(Array.isArray(tiers) ? tiers : [], defList);
    return normalizeTierWeightsOnly(aligned);
}

function modesFullyPopulated(doc) {
    if (!doc?.modes) return false;
    return DIAMOND_MODE_KEYS.every(
        (k) => Array.isArray(doc.modes[k]?.tiers) && doc.modes[k].tiers.length > 0
    );
}

/**
 * Load singleton; create or migrate legacy `tiers` / partial `modes` to full `modes` shape.
 */
export async function loadAndEnsureModesDoc() {
    let doc = await DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
    if (!doc) {
        await DiamondSettings.create({
            _id: DIAMOND_SETTINGS_ID,
            modes: {
                easy: { tiers: DEFAULT_DIAMOND_MODE_TIERS.easy.map((t) => ({ ...t })) },
                normal: { tiers: DEFAULT_DIAMOND_MODE_TIERS.normal.map((t) => ({ ...t })) },
                hard: { tiers: DEFAULT_DIAMOND_MODE_TIERS.hard.map((t) => ({ ...t })) },
            },
            revenueAutoMode: { ...DEFAULT_REVENUE_AUTO_MODE },
        });
        let created = await DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
        return ensureRevenueAutoModePersisted(created);
    }

    if (modesFullyPopulated(doc)) {
        return ensureRevenueAutoModePersisted(doc);
    }

    const legacy = Array.isArray(doc.tiers) && doc.tiers.length > 0 ? doc.tiers : null;

    let normalTiers = alignNormalTiersFromDb(doc.modes?.normal?.tiers);
    if (legacy && (!doc.modes?.normal?.tiers || doc.modes.normal.tiers.length === 0)) {
        normalTiers = alignDiamondTiersToSeven(legacy, NORMAL_DEFS_DEFAULT);
    }

    const canonicalRates = normalTiers.map((t) => t.rate);

    const easyTiers = buildModeTiersWithNormalRates("easy", doc.modes?.easy?.tiers, canonicalRates);
    const hardTiers = buildModeTiersWithNormalRates("hard", doc.modes?.hard?.tiers, canonicalRates);

    const modes = {
        easy: { tiers: easyTiers },
        normal: { tiers: normalTiers },
        hard: { tiers: hardTiers },
    };

    await DiamondSettings.updateOne({ _id: DIAMOND_SETTINGS_ID }, { $set: { modes } });
    let updated = await DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
    return ensureRevenueAutoModePersisted(updated);
}

export async function getResolvedRevenueAutoMode() {
    const doc = await loadAndEnsureModesDoc();
    return resolveRevenueAutoModeFromDoc(doc);
}

function resolvedCanonicalRatesFromDoc(doc) {
    const normalTiers = alignNormalTiersFromDb(doc.modes.normal.tiers);
    return normalTiers.map((t) => t.rate);
}

/**
 * Load tiers for one mode (rates always match normal; weights from this mode in DB).
 * @param {string} [mode="normal"]
 */
export async function getDiamondTiersResolved(mode = "normal") {
    const m = isDiamondMode(mode) ? mode : "normal";
    const doc = await loadAndEnsureModesDoc();
    const canonicalRates = resolvedCanonicalRatesFromDoc(doc);
    const merged = buildModeTiersWithNormalRates(m, doc.modes[m].tiers, canonicalRates);
    return normalizeTierWeightsOnly(merged);
}

/**
 * Public payload for client: paytable per mode (same rates; chances from mode weights).
 */
export async function getDiamondSettingsForClient() {
    const doc = await loadAndEnsureModesDoc();
    const canonicalRates = resolvedCanonicalRatesFromDoc(doc);
    const modes = {};
    for (const key of DIAMOND_MODE_KEYS) {
        const merged = buildModeTiersWithNormalRates(key, doc.modes[key].tiers, canonicalRates);
        const { rates, weights } = normalizeTierWeightsOnly(merged);
        modes[key] = {
            tiers: rates.map((rate, index) => ({
                index,
                rate,
                chance: weights[index],
            })),
        };
    }
    return {
        modes,
        revenueAutoMode: resolveRevenueAutoModeFromDoc(doc),
    };
}

/**
 * Weighted sample using DB-driven tiers for the given mode.
 * @param {string} [mode="normal"]
 * @returns {Promise<{ mult: number, rateIndex: number, tier: string }>}
 */
export async function sampleDiamondPayoutFromDb(mode = "normal") {
    const { rates, weights } = await getDiamondTiersResolved(
        isDiamondMode(mode) ? mode : "normal"
    );
    if (rates.length !== weights.length || rates.length === 0) {
        throw new Error("Invalid diamond tiers configuration");
    }
    const u = Math.random();
    let cum = 0;
    for (let i = 0; i < weights.length; i++) {
        cum += weights[i];
        if (u < cum) {
            return { mult: rates[i], rateIndex: i, tier: `d${i}` };
        }
    }
    const last = rates.length - 1;
    return { mult: rates[last], rateIndex: last, tier: `d${last}` };
}
