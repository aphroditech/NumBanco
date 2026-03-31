import DiamondView from "../../models/diamond/DiamondView.js";
import User from "../../models/User.js";

/** Rows pushed to Ably / full feed trim window (client shows first 13). */
export const DIAMOND_FEED_LIMIT = 22;

/** Default rows returned by GET `/diamond/live-view`. */
export const DIAMOND_LIVE_API_LIMIT = 13;

/** Max documents kept in `diamondviews` after each insert (newest wins). */
export const DIAMOND_VIEWS_COLLECTION_MAX = 500;

async function enrichRowsWithAvatars(rows) {
    const names = [...new Set(rows.map((r) => r.altas).filter(Boolean))];
    if (names.length === 0) return rows;
    const users = await User.find({ altas: { $in: names } }, { altas: 1, avatar: 1 }).lean();
    const byAltas = Object.fromEntries(users.map((u) => [u.altas, u.avatar || ""]));
    return rows.map((r) => ({ ...r, avatar: byAltas[r.altas] ?? r.avatar ?? "" }));
}

/**
 * Keep only the newest `max` rows (by `date` desc).
 */
export async function trimDiamondViewsToMax(max = DIAMOND_VIEWS_COLLECTION_MAX) {
    const recent = await DiamondView.find().sort({ date: -1 }).limit(max).select("_id").lean();
    const recentIds = recent.map((d) => d._id);
    if (recentIds.length === 0) return;
    await DiamondView.deleteMany({ _id: { $nin: recentIds } });
}

/**
 * @param {number} limit
 * @returns {Promise<Array<{ _id, altas, avatar, result, win }>>}
 */
export async function fetchDiamondLivePayload(limit = DIAMOND_LIVE_API_LIMIT) {
    const docs = await DiamondView.find().sort({ date: -1 }).limit(limit).lean();
    const mapped = docs.map((r) => ({
        _id: r._id,
        altas: r.userName ?? "",
        avatar: "",
        result: r.level ?? "—",
        win: Number(r.winAmount ?? 0),
    }));
    return enrichRowsWithAvatars(mapped);
}

export async function publishDiamondViewFeed(ably) {
    if (!ably) return;
    try {
        const data = await fetchDiamondLivePayload(DIAMOND_FEED_LIMIT);
        await ably.channels.get("diamondGame").publish("diamondUpdate", { updatedData: data });
    } catch (err) {
        console.error("[diamond] Ably publish error:", err);
    }
}
