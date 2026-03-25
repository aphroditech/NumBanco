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
    const c = doc.chosenLetterHighRate;
    if (c !== undefined && c !== null && Number.isFinite(Number(c))) {
        out.chosenLetterHighRate = Number(c);
    }
    const z = doc.zButtonHighRate;
    if (z !== undefined && z !== null && Number.isFinite(Number(z))) {
        out.zButtonHighRate = Number(z);
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
    const out = {
        highBandRate: Math.min(1, Math.max(0, Number(merged.highBandRate))),
    };
    if (
        merged.chosenLetterHighRate !== undefined &&
        merged.chosenLetterHighRate !== null &&
        Number.isFinite(Number(merged.chosenLetterHighRate))
    ) {
        out.chosenLetterHighRate = Math.min(
            1,
            Math.max(0, Number(merged.chosenLetterHighRate))
        );
    }
    if (
        merged.zButtonHighRate !== undefined &&
        merged.zButtonHighRate !== null &&
        Number.isFinite(Number(merged.zButtonHighRate))
    ) {
        out.zButtonHighRate = Math.min(1, Math.max(0, Number(merged.zButtonHighRate)));
    }
    return out;
}

export async function updateAlphaTreeSettings(patch) {
    const existing = await AlphaTreeSettings.findById("global").lean();
    const base = { ...DEFAULT_ALPHA_TREE_SETTINGS, ...pickDefined(existing) };
    const withPatch = { ...base, ...pickDefined(patch) };
    const next = normalizeAlphaTreeSettings(withPatch);
    const doc = await AlphaTreeSettings.findByIdAndUpdate(
        "global",
        { $set: next },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return normalizeAlphaTreeSettings({
        ...DEFAULT_ALPHA_TREE_SETTINGS,
        ...pickDefined(doc),
    });
}
