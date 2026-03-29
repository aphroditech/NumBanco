import DiamondView from "../models/diamond/DiamondView.js";

/** Ensures `diamondviews` index on `date` exists when the server starts. */
export async function initializeDiamondViews() {
    try {
        await DiamondView.syncIndexes();
    } catch (err) {
        console.warn("[diamond] DiamondView.syncIndexes:", err?.message || err);
    }
}
