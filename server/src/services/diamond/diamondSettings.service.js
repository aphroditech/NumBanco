import DiamondSettings from "../../models/diamond/DiamondSettings.js";

export const DIAMOND_SETTINGS_ID = "global";

/** Default tiers when no document exists (weights are relative; normalized when sampling). */
export const DEFAULT_DIAMOND_TIERS = [
    { rate: 0, weight: 0.15 },
    { rate: 0.2, weight: 0.6 },
    { rate: 1.2, weight: 0.12 },
    { rate: 2.5, weight: 0.07 },
    { rate: 6, weight: 0.03 },
    { rate: 15, weight: 0.02 },
    { rate: 70, weight: 0.01 },
];

/** Seven tiers fixed (board patterns / rate indices 0–6). Merge DB with defaults per slot. */
export function alignDiamondTiersToSeven(tiers) {
    return DEFAULT_DIAMOND_TIERS.map((def, i) => {
        const t = tiers?.[i];
        const rate = Number(t?.rate);
        const weight = Number(t?.weight);
        return {
            rate: Number.isFinite(rate) ? rate : def.rate,
            weight: Number.isFinite(weight) ? weight : def.weight,
        };
    });
}

export function normalizeDiamondTiers(tiers) {
    const aligned = alignDiamondTiersToSeven(Array.isArray(tiers) ? tiers : []);
    const rates = aligned.map((t) => Number(t.rate));
    const raw = aligned.map((t) => Math.max(0, Number(t.weight) || 0));
    const sum = raw.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
        const n = raw.length || DEFAULT_DIAMOND_TIERS.length;
        const w = 1 / n;
        return { rates, weights: rates.map(() => w) };
    }
    return { rates, weights: raw.map((w) => w / sum) };
}

/**
 * Load singleton settings; upsert defaults if missing or empty tiers.
 */
export async function getDiamondTiersResolved() {
    let doc = await DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
    if (!doc) {
        await DiamondSettings.create({ _id: DIAMOND_SETTINGS_ID, tiers: DEFAULT_DIAMOND_TIERS });
        doc = await DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
    } else if (!Array.isArray(doc.tiers) || doc.tiers.length === 0) {
        await DiamondSettings.updateOne({ _id: DIAMOND_SETTINGS_ID }, { $set: { tiers: DEFAULT_DIAMOND_TIERS } });
        doc = await DiamondSettings.findById(DIAMOND_SETTINGS_ID).lean();
    }
    return normalizeDiamondTiers(doc.tiers || []);
}

/**
 * Public payload for client paytable (rates + normalized chance per tier).
 */
export async function getDiamondSettingsForClient() {
    const { rates, weights } = await getDiamondTiersResolved();
    return {
        tiers: rates.map((rate, index) => ({
            index,
            rate,
            chance: weights[index],
        })),
    };
}

/**
 * Weighted sample using DB-driven tiers.
 * @returns {Promise<{ mult: number, rateIndex: number, tier: string }>}
 */
export async function sampleDiamondPayoutFromDb() {
    const { rates, weights } = await getDiamondTiersResolved();
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
