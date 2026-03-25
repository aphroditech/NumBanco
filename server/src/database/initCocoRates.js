import CocoRate from "../models/CocoRate.js";

/** Mirrors `COCO_MODE_SUCCESS_CONFIG` in cocoController (avoid importing the controller here). */
const COCO_MODE_SUCCESS_CONFIG = {
    0: { base: 0.7, dropPerCombo: 0.08, min: 0.25 },
    1: { base: 0.65, dropPerCombo: 0.1, min: 0.22 },
    2: { base: 0.6, dropPerCombo: 0.12, min: 0.18 },
};

function fallbackRateForCombo(combo, cocoMode) {
    const safeCombo = Number.isFinite(combo) ? Math.max(0, combo) : 0;
    const mode = Number.isFinite(cocoMode) ? cocoMode : 0;
    const cfg = COCO_MODE_SUCCESS_CONFIG[mode] || COCO_MODE_SUCCESS_CONFIG[0];
    return Math.max(cfg.min, cfg.base - safeCombo * cfg.dropPerCombo);
}

/** Enough rows for smash progression before tower-ready; higher combos still fall back in controller if missing. */
const MAX_SEED_SUCCESS_COUNT = 6;

/**
 * Ensures `cocorates` has one document per `successCount` with default easy/normal/hard rates.
 * Uses `$setOnInsert` + `upsert` so existing rows (admin-tuned) are never overwritten.
 */
export async function initializeCocoRates() {
    let inserted = 0;
    for (let sc = 0; sc <= MAX_SEED_SUCCESS_COUNT; sc += 1) {
        const res = await CocoRate.updateOne(
            { successCount: sc },
            {
                $setOnInsert: {
                    successCount: sc,
                    easyRate: fallbackRateForCombo(sc, 0),
                    normalRate: fallbackRateForCombo(sc, 1),
                    hardRate: fallbackRateForCombo(sc, 2),
                },
            },
            { upsert: true }
        );
        if ((res.upsertedCount && res.upsertedCount > 0) || res.upsertedId) {
            inserted += 1;
        }
    }
    if (inserted > 0) {
        console.log(`✅ Coco rates: seeded ${inserted} new combo row(s) (0–${MAX_SEED_SUCCESS_COUNT})`);
    }
}
