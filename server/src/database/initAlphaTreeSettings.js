import AlphaTreeSettings from "../models/AlphaTreeSettings.js";
import {
    DEFAULT_ALPHA_TREE_SETTINGS,
    normalizeAlphaTreeSettings,
} from "../services/alphaTree/alphaTreeSettings.service.js";

/**
 * Ensures `alphatreesettings` has `_id: "global"` with defaults on first deploy.
 * Does not overwrite existing `highBandRate` or optional fields.
 */
export async function initializeAlphaTreeSettings() {
    const existing = await AlphaTreeSettings.findById("global").lean();
    if (!existing) {
        const next = normalizeAlphaTreeSettings(DEFAULT_ALPHA_TREE_SETTINGS);
        await AlphaTreeSettings.findByIdAndUpdate(
            "global",
            { $set: next },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log("✅ Alpha Tree settings initialized");
        return;
    }

    const updates = {};
    if (existing.highBandRate == null || !Number.isFinite(Number(existing.highBandRate))) {
        updates.highBandRate = DEFAULT_ALPHA_TREE_SETTINGS.highBandRate;
    }
    if (Object.keys(updates).length > 0) {
        await AlphaTreeSettings.findByIdAndUpdate("global", { $set: updates });
        console.log("✅ Alpha Tree settings — patched missing highBandRate");
    }
}
