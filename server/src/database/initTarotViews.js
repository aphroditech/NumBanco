import TarotView from "../models/tarot/TarotView.js";

export async function initializeTarotViews() {
    try {
        await TarotView.syncIndexes();
    } catch (err) {
        console.warn("[tarot] TarotView.syncIndexes:", err?.message || err);
    }
}
