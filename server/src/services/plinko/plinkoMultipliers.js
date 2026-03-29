/**
 * Keep in sync with `client/src/views/Plinko/plinkoMultipliers.js` (server resolves outcomes).
 */
/** Reference 17-bucket row (16 peg rows) when no custom ladder is set. Odds: PLINKO_ROW16_SLOT_WEIGHTS. */
export const PLINKO_REFERENCE_17 = [
    10000, 225, 20, 5, 2, 1, 0.3, 0.2, 0.1, 0.2, 0.3, 1, 2, 5, 20, 225, 10000,
];

/**
 * Symmetric multipliers per peg-row count (left edge → center, mirrored).
 * Values match requested ladders for rows 8–15.
 */
export const PLINKO_ROW_MULTIPLIERS = {
    /** Slot probs (8 rows, 9 buckets): 20× 0.39% each, 3× 3.13%, 1.05× 10.94%, 0.2× 21.88%, 0.1× 27.34% center — see PLINKO_ROW8_SLOT_WEIGHTS */
    8: [20, 3, 1.05, 0.2, 0.1, 0.2, 1.05, 3, 20],
    /** Probabilities: PLINKO_ROW9_SLOT_WEIGHTS (100× 0%, 8.3× 1%, 1.3× 7.03%, …) */
    9: [100, 8.3, 1.3, 0.2, 0.1, 0.1, 0.2, 1.3, 8.3, 100],
    /** Probabilities: PLINKO_ROW10_SLOT_WEIGHTS (200× 0%, 10× 0.8%, 1.3× 4%, …) */
    10: [200, 10, 1.3, 0.3, 0.2, 0.1, 0.2, 0.3, 1.3, 10, 200],
    /** Probabilities: PLINKO_ROW11_SLOT_WEIGHTS (500× 0%, 10× 0.5%, 2× 2.5%, …) */
    11: [500, 10, 2, 1, 0.2, 0.1, 0.1, 0.2, 1, 2, 10, 500],
    /** Probabilities: PLINKO_ROW12_SLOT_WEIGHTS (750× 0%; 15× 0.2% left / 0.29% right; …) */
    12: [750, 15, 5.5, 1.2, 0.5, 0.2, 0.1, 0.2, 0.5, 1.2, 5.5, 15, 750],
    /** Probabilities: PLINKO_ROW13_SLOT_WEIGHTS (binomial “ways” table; 1000× / 26× 0%) */
    13: [1000, 26, 7.5, 2.4, 0.5, 0.3, 0.1, 0.1, 0.3, 0.5, 2.4, 7.5, 26, 1000],
    /** Probabilities: PLINKO_ROW14_SLOT_WEIGHTS (2000× / 49× 0%; 13× 0.56%; …) */
    14: [2000, 49, 13, 3, 1.2, 0.3, 0.2, 0.1, 0.2, 0.3, 1.2, 3, 13, 49, 2000],
    /** Probabilities: PLINKO_ROW15_SLOT_WEIGHTS (5000× / 120× 0%; 18× 0.32%; …) */
    15: [5000, 120, 18, 6, 1.5, 0.3, 0.2, 0.1, 0.1, 0.2, 0.3, 1.5, 6, 18, 120, 5000],
};

const RISK_SCALE = {
    regular: { edge: 1, mid: 1, center: 1 },
    high: { edge: 1.08, mid: 1.05, center: 1 },
    nightmare: { edge: 1.15, mid: 1.08, center: 1 },
    lightning: { edge: 1.22, mid: 1.12, center: 0.95 },
};

/** Per-bucket landing probability for 8 peg rows (index 0 = left 20× … 4 = center 0.1× … 8 = right 20×). Sums to 1. */
export const PLINKO_ROW8_SLOT_WEIGHTS = [
    0.0039, 0.0313, 0.1094, 0.2188, 0.2734, 0.2188, 0.1094, 0.0313, 0.0039,
];

/** 9 peg rows, 10 buckets: 100× 0% edges, then 8.3× 1%, 1.3× 7.03%, 0.2× 16.41%, 0.1× 24.61% (×2). Sums to 0.981; roll normalizes. */
export const PLINKO_ROW9_SLOT_WEIGHTS = [
    0, 0.01, 0.0703, 0.1641, 0.2461, 0.2461, 0.1641, 0.0703, 0.01, 0,
];

/** 10 peg rows, 11 buckets: 200× 0% edges; 10× 0.8%; 1.3× 4%; 0.3× 12%; 0.2× 20.51%; 0.1× 24.61% center. */
export const PLINKO_ROW10_SLOT_WEIGHTS = [
    0, 0.008, 0.04, 0.12, 0.2051, 0.2461, 0.2051, 0.12, 0.04, 0.008, 0,
];

/** 11 peg rows, 12 buckets: 500× 0% edges; 10× 0.5%; 2× 2.5%; 1× 8.06%; 0.2× 17.11%; 0.1× 22.56% (×2). Table sums ≈101.46%; roll normalizes. */
export const PLINKO_ROW11_SLOT_WEIGHTS = [
    0, 0.005, 0.025, 0.0806, 0.1711, 0.2256, 0.2256, 0.1711, 0.0806, 0.025, 0.005, 0,
];

/** 12 peg rows, 13 buckets: 750× 0% edges; 15× 0.2% (slot 1) / 0.29% (slot 11); rest symmetric per table. */
export const PLINKO_ROW12_SLOT_WEIGHTS = [
    0, 0.002, 0.0161, 0.0537, 0.1208, 0.1934, 0.2256, 0.1934, 0.1208, 0.0537, 0.0161, 0.0029, 0,
];

/** 13 peg rows, 14 buckets: 1000× & 26× 0%; then 7.5× 0.95% … 0.1× 20.95% (×2). Inner sum 99.66%. */
export const PLINKO_ROW13_SLOT_WEIGHTS = [
    0, 0, 0.0095, 0.0349, 0.0873, 0.1571, 0.2095, 0.2095, 0.1571, 0.0873, 0.0349, 0.0095, 0, 0,
];

/** 14 peg rows, 15 buckets: 2000× & 49× 0%; 13× 0.56% … 0.1× 20.95% center. Inner sum ≈99.83%. */
export const PLINKO_ROW14_SLOT_WEIGHTS = [
    0, 0, 0.0056, 0.0222, 0.0611, 0.1222, 0.1833, 0.2095, 0.1833, 0.1222, 0.0611, 0.0222, 0.0056, 0, 0,
];

/** 15 peg rows, 16 buckets: 5000× & 120× 0%; 18× 0.32% … 0.1× 19.63% (×2). Inner sum ≈99.86%. */
export const PLINKO_ROW15_SLOT_WEIGHTS = [
    0, 0, 0.0032, 0.0139, 0.0416, 0.0916, 0.1527, 0.1963, 0.1963, 0.1527, 0.0916, 0.0416, 0.0139, 0.0032, 0, 0,
];

/** 16 peg rows, 17 buckets: matches PLINKO_REFERENCE_17; left half of table mirrored (10000×/225× 0%). Sum ≈99.95%. */
export const PLINKO_ROW16_SLOT_WEIGHTS = [
    0,
    0,
    0.00183,
    0.00855,
    0.0278,
    0.0666,
    0.1222,
    0.1746,
    0.1964,
    0.1746,
    0.1222,
    0.0666,
    0.0278,
    0.00855,
    0.00183,
    0,
    0,
];

export function pickWeightedSlot(weights) {
    const sum = weights.reduce((a, w) => a + w, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < weights.length; i += 1) {
        r -= weights[i];
        if (r < 0) return i;
    }
    return weights.length - 1;
}

/** Sum of weights[lo..hi] as % of total weight (for footer). */
function weightedBandPercent(weights, lo, hi) {
    const total = weights.reduce((a, w) => a + w, 0);
    if (total <= 0) return 0;
    let p = 0;
    for (let k = lo; k <= hi; k += 1) {
        p += weights[k] ?? 0;
    }
    return Math.round((p / total) * 10000) / 100;
}

/** Resample symmetric reference curve to `bucketCount` points (fallback / row 16). */
function fromReference(bucketCount, riskKey) {
    const ref = PLINKO_REFERENCE_17;
    const sc = RISK_SCALE[riskKey] || RISK_SCALE.regular;
    const half = (ref.length - 1) / 2;
    return Array.from({ length: bucketCount }, (_, i) => {
        const u = bucketCount <= 1 ? 0.5 : i / (bucketCount - 1);
        const idx = u * (ref.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.min(ref.length - 1, lo + 1);
        const w = idx - lo;
        let v = ref[lo] * (1 - w) + ref[hi] * w;
        const dist = Math.abs(i - (bucketCount - 1) / 2) / half;
        let factor = sc.mid;
        if (dist > 0.85) factor = sc.edge;
        else if (dist < 0.15) factor = sc.center;
        if (v >= 1) v *= factor;
        else v *= dist < 0.18 ? sc.center : 1;
        if (v > 1) v = Math.round(v * 100) / 100;
        else v = Math.round(v * 1000) / 1000;
        return v;
    });
}

function applyRiskToRow(baseArr, riskKey) {
    const sc = RISK_SCALE[riskKey] || RISK_SCALE.regular;
    if (sc.edge === 1 && sc.mid === 1 && sc.center === 1) return baseArr.slice();
    const n = baseArr.length;
    const half = (n - 1) / 2;
    return baseArr.map((v, i) => {
        const dist = Math.abs(i - (n - 1) / 2) / half;
        let factor = sc.mid;
        if (dist > 0.85) factor = sc.edge;
        else if (dist < 0.15) factor = sc.center;
        let out = v;
        if (out >= 1) out *= factor;
        else if (dist < 0.2) out *= factor;
        if (out > 1) out = Math.round(out * 100) / 100;
        else out = Math.round(out * 1000) / 1000;
        return out;
    });
}

export function getPlinkoMultipliers(rows, riskKey = 'regular') {
    const n = Math.max(8, Math.min(16, Math.round(rows)));
    const bucketCount = n + 1;

    let base;
    const custom = PLINKO_ROW_MULTIPLIERS[n];
    if (custom && custom.length === bucketCount) {
        base = custom;
    } else if (n === 16) {
        base = PLINKO_REFERENCE_17;
    } else {
        base = fromReference(bucketCount, 'regular');
    }

    return applyRiskToRow(base, riskKey);
}

/** Built-in landing weights for peg rows 8–16 (length = rows + 1). */
export function getBuiltInSlotWeightsForRows(rows) {
    const n = Math.max(8, Math.min(16, Math.round(rows)));
    const table = {
        8: PLINKO_ROW8_SLOT_WEIGHTS,
        9: PLINKO_ROW9_SLOT_WEIGHTS,
        10: PLINKO_ROW10_SLOT_WEIGHTS,
        11: PLINKO_ROW11_SLOT_WEIGHTS,
        12: PLINKO_ROW12_SLOT_WEIGHTS,
        13: PLINKO_ROW13_SLOT_WEIGHTS,
        14: PLINKO_ROW14_SLOT_WEIGHTS,
        15: PLINKO_ROW15_SLOT_WEIGHTS,
        16: PLINKO_ROW16_SLOT_WEIGHTS,
    };
    const w = table[n];
    return w ? [...w] : null;
}

/**
 * Returns slot index 0…rows (rights count). Rows 8–16 use custom weights.
 */
export function rollPlinkoSlot(rows) {
    const n = Math.max(8, Math.min(16, Math.round(rows)));
    const built = getBuiltInSlotWeightsForRows(n);
    if (built) return pickWeightedSlot(built);
    let rights = 0;
    for (let i = 0; i < n; i += 1) {
        if (Math.random() < 0.5) rights += 1;
    }
    return rights;
}

/** Mid-band % (same band as footer UI) for arbitrary weight table. */
export function getMidBucketBandPercentFromWeights(rows, weights) {
    const n = Math.max(8, Math.min(16, Math.round(rows)));
    if (!Array.isArray(weights) || weights.length !== n + 1) return 0;
    const mid = Math.floor((n + 1) / 2);
    const lo = Math.max(0, mid - Math.ceil(n / 6));
    const hi = Math.min(n, mid + Math.ceil(n / 6));
    return weightedBandPercent(weights, lo, hi);
}

/**
 * ~Probability (%) of landing in the same “mid bucket” band as the footer UI (lo…hi around center).
 */
export function getApproxMidBucketPercent(rows) {
    const n = Math.max(8, Math.min(16, Math.round(rows)));
    const bucketCount = n + 1;
    const mid = Math.floor((n + 1) / 2);
    const lo = Math.max(0, mid - Math.ceil(n / 6));
    const hi = Math.min(n, mid + Math.ceil(n / 6));
    if (n === 8) {
        return weightedBandPercent(PLINKO_ROW8_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 9) {
        return weightedBandPercent(PLINKO_ROW9_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 10) {
        return weightedBandPercent(PLINKO_ROW10_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 11) {
        return weightedBandPercent(PLINKO_ROW11_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 12) {
        return weightedBandPercent(PLINKO_ROW12_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 13) {
        return weightedBandPercent(PLINKO_ROW13_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 14) {
        return weightedBandPercent(PLINKO_ROW14_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 15) {
        return weightedBandPercent(PLINKO_ROW15_SLOT_WEIGHTS, lo, hi);
    }
    if (n === 16) {
        return weightedBandPercent(PLINKO_ROW16_SLOT_WEIGHTS, lo, hi);
    }
    let p = 0;
    for (let k = lo; k <= hi; k += 1) {
        // eslint-disable-next-line no-loop-func
        const coeff = (function binom(nn, kk) {
            if (kk < 0 || kk > nn) return 0;
            let c = 1;
            for (let i = 0; i < kk; i += 1) c = (c * (nn - i)) / (i + 1);
            return c;
        })(n, k);
        p += coeff * 0.5 ** n;
    }
    return Math.round(p * 10000) / 100;
}

/** Random path (L/R) with exactly `rights` right moves among `rows` steps. */
export function pathForSlot(rows, rights) {
    const n = Math.max(8, Math.min(16, Math.round(rows)));
    const r = Math.max(0, Math.min(n, rights));
    const steps = Array.from({ length: n }, (_, i) => (i < r ? 1 : 0));
    for (let i = steps.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [steps[i], steps[j]] = [steps[j], steps[i]];
    }
    return steps;
}
