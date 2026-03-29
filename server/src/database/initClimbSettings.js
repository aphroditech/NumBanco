import ClimbSettings from "../models/ClimbSettings.js";
import { DEFAULT_CLIMB_SETTINGS } from "../services/climb/climbSettings.service.js";

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
        const currentRates = existing?.[modeKey]?.starRates;
        const ratesOk =
            Array.isArray(currentRates) &&
            currentRates.length === 5 &&
            currentRates.every((n) => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 1);
        if (!ratesOk) {
            updates[`${modeKey}.starRates`] = DEFAULT_CLIMB_SETTINGS[modeKey].starRates;
        }
    }
    if (Object.keys(updates).length > 0) {
        await ClimbSettings.findByIdAndUpdate(targetId, { $set: updates });
        console.log("✅ Climb settings patched");
    }
}

