import AlphaTreeSettings from "../../models/AlphaTreeSettings.js";

/** Defaults match previous hardcoded controller behavior */
export const DEFAULT_ALPHA_TREE_SETTINGS = {
    baseMultiplier: 0.6,
    easyBustRerollChance: 0.18,
    midPowEasy: 0.78,
    midPowHard: 1.28,
    highStretchEasy: 1.065,
    highStretchHard: 0.935,
    highStretchNormal: 1,
    // Original behavior was one-high-per-step across 3 letters → probability ~1/3.
    highBandRate: 0.3333,
    step10MultEasy: 1.02,
    step10MultHard: 0.98,
};

function pickDefined(doc) {
    if (!doc || typeof doc !== "object") return {};
    const out = {};
    for (const k of Object.keys(DEFAULT_ALPHA_TREE_SETTINGS)) {
        const v = doc[k];
        if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
            out[k] = Number(v);
        }
    }
    return out;
}

/**
 * Single global document `_id: "global"`. Merged with code defaults when fields are missing.
 */
export async function getAlphaTreeSettingsMerged() {
    const doc = await AlphaTreeSettings.findById("global").lean();
    return { ...DEFAULT_ALPHA_TREE_SETTINGS, ...pickDefined(doc) };
}
