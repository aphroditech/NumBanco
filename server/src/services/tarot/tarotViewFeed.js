import TarotView from "../../models/tarot/TarotView.js";
import User from "../../models/User.js";

export const TAROT_FEED_LIMIT = 22;
export const TAROT_LIVE_API_LIMIT = 13;
export const TAROT_VIEWS_COLLECTION_MAX = 500;

async function enrichRowsWithAvatars(rows) {
    const names = [...new Set(rows.map((r) => r.altas).filter(Boolean))];
    if (names.length === 0) return rows;
    const users = await User.find({ altas: { $in: names } }, { altas: 1, avatar: 1 }).lean();
    const byAltas = Object.fromEntries(users.map((u) => [u.altas, u.avatar || ""]));
    return rows.map((r) => ({ ...r, avatar: byAltas[r.altas] ?? r.avatar ?? "" }));
}

export async function trimTarotViewsToMax(max = TAROT_VIEWS_COLLECTION_MAX) {
    const recent = await TarotView.find().sort({ date: -1 }).limit(max).select("_id").lean();
    const recentIds = recent.map((d) => d._id);
    if (recentIds.length === 0) return;
    await TarotView.deleteMany({ _id: { $nin: recentIds } });
}

/**
 * @param {number} limit
 * @returns {Promise<Array<{ _id, altas, avatar, result, win }>>}
 */
export async function fetchTarotLivePayload(limit = TAROT_LIVE_API_LIMIT) {
    const docs = await TarotView.find().sort({ date: -1 }).limit(limit).lean();
    const mapped = docs.map((r) => {
        const raw = r.result ?? r.level;
        const resultStr = raw != null && raw !== "" ? String(raw) : "—";
        return {
            _id: r._id,
            altas: r.userName ?? "",
            avatar: "",
            result: resultStr,
            win: Number(r.winAmount ?? 0),
        };
    });
    return enrichRowsWithAvatars(mapped);
}

export async function publishTarotViewFeed(ably) {
    if (!ably) return;
    try {
        const data = await fetchTarotLivePayload(TAROT_FEED_LIMIT);
        await ably.channels.get("tarotGame").publish("tarotUpdate", { updatedData: data });
    } catch (err) {
        console.error("[tarot] Ably publish error:", err);
    }
}
