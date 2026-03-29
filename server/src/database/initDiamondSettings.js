import DiamondSettings from "../models/diamond/DiamondSettings.js";
import { DIAMOND_SETTINGS_ID, getDiamondTiersResolved } from "../services/diamond/diamondSettings.service.js";

export async function initializeDiamondSettings() {
    const existed = await DiamondSettings.exists({ _id: DIAMOND_SETTINGS_ID });
    await getDiamondTiersResolved();
    if (!existed) {
        console.log("✅ Diamond settings initialized with defaults");
    }
}
