import TarotSettings from "../models/tarot/TarotSettings.js";
import { getTarotSettingsMerged } from "../services/tarot/tarotGame.service.js";

export async function initializeTarotSettings() {
    const existed = await TarotSettings.exists({ _id: "global" });
    await getTarotSettingsMerged();
    if (!existed) {
        console.log("✅ Tarot settings initialized with defaults");
    }
}
