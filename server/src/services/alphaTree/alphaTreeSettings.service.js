import AlphaTreeSettings from "../../models/AlphaTreeSettings.js";

export const DEFAULT_ALPHA_TREE_SETTINGS = {
    highBandRate: 0.3333,
};

function pickDefined(doc) {
    if (!doc || typeof doc !== "object") return {};
    const out = {};
    const v = doc.highBandRate;
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
        out.highBandRate = Number(v);
    }
    return out;
}

/**
 * Single global document `_id: "global"`. Merged with code defaults when fields are missing.
 */
export async function getAlphaTreeSettingsMerged() {
    const doc = await AlphaTreeSettings.findById("global").lean();
    return normalizeAlphaTreeSettings({ ...DEFAULT_ALPHA_TREE_SETTINGS, ...pickDefined(doc) });
}

export function normalizeAlphaTreeSettings(raw) {
    const merged = { ...DEFAULT_ALPHA_TREE_SETTINGS, ...pickDefined(raw) };
    merged.highBandRate = Math.min(1, Math.max(0, Number(merged.highBandRate)));
    return { highBandRate: merged.highBandRate };
}

export async function updateAlphaTreeSettings(patch) {
    const next = normalizeAlphaTreeSettings(patch);
    const doc = await AlphaTreeSettings.findByIdAndUpdate(
        "global",
        { $set: next },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return normalizeAlphaTreeSettings(doc);
}
