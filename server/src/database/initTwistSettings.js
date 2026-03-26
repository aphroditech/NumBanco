import TwistSettings from "../models/TwistSettings.js";
import { DEFAULT_TWIST_SETTINGS } from "../services/twist/twistSettings.service.js";

export async function initializeTwistSettings() {
    const existingGlobal = await TwistSettings.findById("global").lean();
    const existingAny =
        existingGlobal ||
        (await TwistSettings.findOne({}).sort({ updatedAt: -1, createdAt: -1 }).lean());
    const targetId = existingGlobal?._id || existingAny?._id || "global";
    const existing = existingAny;
    if (!existing) {
        await TwistSettings.findByIdAndUpdate(
            "global",
            { $set: DEFAULT_TWIST_SETTINGS },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log("✅ Twist settings initialized");
        return;
    }

    const updates = {};
    for (const modeKey of Object.keys(DEFAULT_TWIST_SETTINGS)) {
        const modeDefaults = DEFAULT_TWIST_SETTINGS[modeKey];
        const modeExisting = existing?.[modeKey] || {};
        for (const [rateKey, rateValue] of Object.entries(modeDefaults)) {
            const current = modeExisting?.[rateKey];
            if (current == null || !Number.isFinite(Number(current)) || Number(current) < 0) {
                updates[`${modeKey}.${rateKey}`] = rateValue;
            }
        }
    }
    if (Object.keys(updates).length > 0) {
        await TwistSettings.findByIdAndUpdate(targetId, { $set: updates });
        console.log("✅ Twist settings patched");
    }
}

