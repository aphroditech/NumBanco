import PlinkoRateSettings from "../models/plinko/PlinkoRateSettings.js";
import {
  getBuiltInSlotWeightsForRows,
  getPlinkoMultipliers,
} from "../services/plinko/plinkoMultipliers.js";

const PLINKO_RISK = "regular";
const ROW_MIN = 8;
const ROW_MAX = 16;

/**
 * Optional Mines-style landing distribution (per row key "8"…"16"):
 * `multiplierBandsByRows: { "12": [ { min, max, probability }, … ], … }`
 * Each band’s probability is split across buckets whose multiplier falls in [min, max].
 *
 * Example:
 * `[ { min: 1, max: 10, probability: 0.73 }, { min: 10, max: 100, probability: 0.25 }, { min: 100, max: 1000, probability: 0.02 } ]`
 */

/** Keys "8"…"16" → built-in multipliers per bucket (legacy backfill only). */
function buildDefaultSlotMultipliersByRows() {
  const o = {};
  for (let r = ROW_MIN; r <= ROW_MAX; r += 1) {
    o[String(r)] = getPlinkoMultipliers(r, PLINKO_RISK);
  }
  return o;
}

/** Keys "8"…"16" → [{ multiplier, rate }, …] per row (canonical single-field ladder). */
function buildDefaultSlotEntriesByRows() {
  const o = {};
  for (let r = ROW_MIN; r <= ROW_MAX; r += 1) {
    const w = getBuiltInSlotWeightsForRows(r);
    const m = getPlinkoMultipliers(r, PLINKO_RISK);
    if (!w || !m || m.length !== r + 1) continue;
    o[String(r)] = m.map((mult, i) => ({
      multiplier: mult,
      rate: Math.max(0, w[i] ?? 0),
    }));
  }
  return o;
}

/** Merge legacy parallel arrays into unified `slotEntriesByRows` (preserves admin values). */
function zipLegacyToSlotEntries(doc) {
  const out = {};
  for (let r = ROW_MIN; r <= ROW_MAX; r += 1) {
    const key = String(r);
    const w = doc?.slotPercentsByRows?.[key];
    const m = doc?.slotMultipliersByRows?.[key];
    if (!Array.isArray(w) || w.length !== r + 1 || !Array.isArray(m) || m.length !== r + 1) {
      continue;
    }
    const sumW = w.reduce((a, x) => a + Math.max(0, Number(x) || 0), 0);
    if (sumW <= 0) continue;
    out[key] = w.map((rate, i) => ({
      multiplier: Number(m[i]) || 0,
      rate: Math.max(0, Number(rate) || 0),
    }));
  }
  return out;
}

function slotEntriesHasRows(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).length > 0;
}

/**
 * Upsert singleton with defaults on first insert only (`$setOnInsert`).
 * Existing (often empty) documents are filled on each boot when safe:
 * - legacy percents + multipliers → zip into `slotEntriesByRows`
 * - else if `slotEntriesByRows` was never stored (`null` / missing), seed built-in ladder
 * Intentionally empty `{}` after reset is left alone (field exists, so we do not re-seed).
 */
export async function initializePlinkoRateSettings() {
  const defaultsEntries = buildDefaultSlotEntriesByRows();
  const res = await PlinkoRateSettings.updateOne(
    {},
    {
      $setOnInsert: {
        slotEntriesByRows: defaultsEntries,
        multiplierBandsByRows: {},
        slotPercentsByRows: {},
        slotMultipliersByRows: {},
      },
    },
    { upsert: true }
  );
  if (res.upsertedCount > 0 || res.upsertedId) {
    console.log(
      "✅ Plinko rate settings: created default document (rows 8–16, slotEntriesByRows ladder; bands empty)"
    );
    return;
  }

  const doc = await PlinkoRateSettings.findOne().lean();
  if (!doc) return;

  if (!slotEntriesHasRows(doc.slotEntriesByRows)) {
    const zipped = zipLegacyToSlotEntries(doc);
    if (Object.keys(zipped).length > 0) {
      await PlinkoRateSettings.updateOne({}, { $set: { slotEntriesByRows: zipped } });
      console.log("✅ Plinko rate settings: migrated legacy percents/multipliers → slotEntriesByRows");
    } else {
      // `$setOnInsert` does not run for documents that already existed (even empty). Fill when the
      // field is absent in BSON. Deliberate `{}` after reset is left alone so the game keeps using code defaults.
      const filled = await PlinkoRateSettings.updateOne(
        { $or: [{ slotEntriesByRows: { $exists: false } }, { slotEntriesByRows: null }] },
        { $set: { slotEntriesByRows: defaultsEntries } }
      );
      if (filled.modifiedCount > 0) {
        console.log(
          "✅ Plinko rate settings: backfilled slotEntriesByRows (field was missing — $setOnInsert only runs on insert)"
        );
      }
    }
  }

  const doc2 = await PlinkoRateSettings.findOne().lean();
  const entriesDrive = slotEntriesHasRows(doc2?.slotEntriesByRows);
  if (
    doc2 &&
    !entriesDrive &&
    (!doc2.slotMultipliersByRows || Object.keys(doc2.slotMultipliersByRows || {}).length === 0)
  ) {
    await PlinkoRateSettings.updateOne(
      {},
      { $set: { slotMultipliersByRows: buildDefaultSlotMultipliersByRows() } }
    );
    console.log("✅ Plinko rate settings: backfilled slotMultipliersByRows from built-in ladder");
  }
}
