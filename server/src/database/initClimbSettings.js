import ClimbSettings from "../models/ClimbSettings.js";
import {
    CLIMB_MODE_COLS,
    DEFAULT_CLIMB_SETTINGS,
} from "../services/climb/climbSettings.service.js";

export async function initializeClimbSettings() {
    const existingGlobal = await ClimbSettings.findById("global").lean();
    const existingAny =
        existingGlobal ||
        (await ClimbSettings.findOne({}).sort({ updatedAt: -1, createdAt: -1 }).lean());
    const targetId = existingGlobal?._id || existingAny?._id || "global";
    const existing = existingAny;

    if (!existing) {
        await ClimbSettings.findByIdAndUpdate(
            "global",
            { $set: DEFAULT_CLIMB_SETTINGS },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log("✅ Climb settings initialized");
        return;
    }

    const updates = {};
    for (const modeKey of Object.keys(DEFAULT_CLIMB_SETTINGS)) {
        const currentList = existing?.[modeKey]?.multipliers;
        const valid =
            Array.isArray(currentList) &&
            currentList.length === 5 &&
            currentList.every((n) => Number.isFinite(Number(n)) && Number(n) > 0);
        if (!valid) {
            updates[`${modeKey}.multipliers`] = DEFAULT_CLIMB_SETTINGS[modeKey].multipliers;
        }
        const cols = CLIMB_MODE_COLS[modeKey] || 5;
        const br = Number(existing?.[modeKey]?.banRate);
        if (!Number.isFinite(br) || br < 0 || br > 1) {
            updates[`${modeKey}.banRate`] = 1 / cols;
        }
    }
    if (Object.keys(updates).length > 0) {
        await ClimbSettings.findByIdAndUpdate(targetId, { $set: updates });
        console.log("✅ Climb settings patched");
    }
}

