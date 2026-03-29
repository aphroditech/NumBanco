import PlinkoRateSettings from "../../models/plinko/PlinkoRateSettings.js";
import {
  pickWeightedSlot,
  getBuiltInSlotWeightsForRows,
  getPlinkoMultipliers,
} from "./plinkoMultipliers.js";

const PLINKO_RISK = "regular";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse `slotEntriesByRows[row]` — array length rowCount+1 of `{ multiplier, rate | weight }`.
 * Returns multipliers + raw landing weights, or null if invalid.
 */
export function parseStoredSlotEntries(arr, rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const len = n + 1;
  if (!Array.isArray(arr) || arr.length !== len) return null;
  const mults = [];
  const weights = [];
  for (const item of arr) {
    const m = toNum(item?.multiplier);
    const w = Math.max(0, toNum(item?.rate ?? item?.weight));
    mults.push(m >= 0 && Number.isFinite(m) ? m : 0);
    weights.push(w);
  }
  if (!mults.some((x) => x > 0)) return null;
  if (weights.reduce((a, b) => a + b, 0) <= 0) return null;
  return { mults, weights };
}

/**
 * Turn Mines-style multiplier bands into per-slot weights (length = mults.length).
 * Each band's probability is split uniformly across bucket indices whose multiplier lies in [min, max].
 */
export function weightsFromMultiplierBands(mults, bands) {
  if (!Array.isArray(mults) || mults.length === 0 || !Array.isArray(bands) || bands.length === 0) {
    return null;
  }
  const n = mults.length;
  const weights = Array.from({ length: n }, () => 0);
  let assigned = 0;

  for (const b of bands) {
    const p = Math.max(0, toNum(b.probability));
    const lo = toNum(b.min);
    const hi = toNum(b.max);
    if (!(p > 0) || !Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    const lo2 = Math.min(lo, hi);
    const hi2 = Math.max(lo, hi);
    const indices = [];
    for (let i = 0; i < n; i += 1) {
      const m = toNum(mults[i]);
      if (m >= lo2 && m <= hi2) indices.push(i);
    }
    if (indices.length === 0) continue;
    const share = p / indices.length;
    for (const i of indices) weights[i] += share;
  }

  const s = weights.reduce((a, b) => a + b, 0);
  if (s <= 0) return null;
  return weights.map((w) => w / s);
}

const cache = { doc: null, stale: true };

export function invalidatePlinkoRatesCache() {
  cache.stale = true;
  cache.doc = null;
}

async function loadDoc() {
  if (!cache.stale) return cache.doc;
  cache.doc = await PlinkoRateSettings.findOne().lean();
  cache.stale = false;
  return cache.doc;
}

/**
 * Effective multipliers for `rowCount` buckets (length rowCount + 1).
 * Precedence: `slotEntriesByRows` → `slotMultipliersByRows` → built-in ladder.
 */
export async function getEffectiveMultipliersForRows(rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const doc = await loadDoc();
  const key = String(n);
  const fromEntries = parseStoredSlotEntries(doc?.slotEntriesByRows?.[key], n);
  if (fromEntries) return fromEntries.mults;
  const custom = doc?.slotMultipliersByRows?.[key];
  if (Array.isArray(custom) && custom.length === n + 1) {
    const mults = custom.map((x) => {
      const v = toNum(x);
      return v >= 0 && Number.isFinite(v) ? v : 0;
    });
    if (mults.some((m) => m > 0)) return mults;
  }
  return getPlinkoMultipliers(n, PLINKO_RISK);
}

/**
 * Effective landing weights for `rowCount` peg rows (array length rowCount + 1).
 * Precedence: `multiplierBandsByRows` → `slotEntriesByRows` (rate) → `slotPercentsByRows` → built-in.
 */
export async function getEffectiveSlotWeightsForRows(rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const doc = await loadDoc();
  const key = String(n);
  const mults = await getEffectiveMultipliersForRows(n);
  const bands = doc?.multiplierBandsByRows?.[key];
  if (Array.isArray(bands) && bands.length > 0) {
    const w = weightsFromMultiplierBands(mults, bands);
    if (w && w.length === n + 1) {
      const s = w.reduce((a, b) => a + b, 0);
      if (s > 0) return w;
    }
  }
  const fromEntries = parseStoredSlotEntries(doc?.slotEntriesByRows?.[key], n);
  if (fromEntries) return fromEntries.weights;
  const custom = doc?.slotPercentsByRows?.[key];
  if (Array.isArray(custom) && custom.length === n + 1) {
    const weights = custom.map((x) => Math.max(0, toNum(x)));
    const s = weights.reduce((a, b) => a + b, 0);
    if (s > 0) return weights;
  }
  const built = getBuiltInSlotWeightsForRows(n);
  if (built) return built;
  return Array.from({ length: n + 1 }, () => 1);
}

export async function rollPlinkoSlotFromConfig(rows) {
  const w = await getEffectiveSlotWeightsForRows(rows);
  return pickWeightedSlot(w);
}

export async function rowUsesDatabaseBands(rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const doc = await loadDoc();
  const key = String(n);
  const bands = doc?.multiplierBandsByRows?.[key];
  return Array.isArray(bands) && bands.length > 0;
}

export async function rowUsesDatabaseSlotEntries(rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const doc = await loadDoc();
  const key = String(n);
  return parseStoredSlotEntries(doc?.slotEntriesByRows?.[key], n) != null;
}

export async function rowUsesDatabaseWeights(rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const doc = await loadDoc();
  const key = String(n);
  const custom = doc?.slotPercentsByRows?.[key];
  if (!Array.isArray(custom) || custom.length !== n + 1) return false;
  const weights = custom.map((x) => Math.max(0, toNum(x)));
  return weights.reduce((a, b) => a + b, 0) > 0;
}

export async function rowUsesDatabaseMultipliers(rowCount) {
  const n = Math.max(8, Math.min(16, Math.round(rowCount)));
  const doc = await loadDoc();
  const key = String(n);
  if (parseStoredSlotEntries(doc?.slotEntriesByRows?.[key], n)) return true;
  const custom = doc?.slotMultipliersByRows?.[key];
  if (!Array.isArray(custom) || custom.length !== n + 1) return false;
  const mults = custom.map((x) => toNum(x));
  return mults.some((m) => m > 0);
}

export async function getPlinkoRatesDocLean() {
  return loadDoc();
}
