import User from "../../models/User.js";
import AlphaTreeView from "../../models/AlphaTreeView.js";

export const VIEW_LIMIT = 12;

export async function enrichAlphaTreeViewsWithUser(views) {
    return Promise.all(
        views.map(async (item) => {
            const user = await User.findOne(
                { userId: item.userId },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    password: 0,
                    country: 0,
                    pumpingMode: 0,
                    rubicMode: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    canWithdraw: 0,
                }
            );
            const obj = item.toObject();
            delete obj.isUser;
            if (user) {
                return {
                    ...obj,
                    avatar: user.avatar,
                    altas: user.altas,
                    membership: user.membership,
                };
            }
            return obj;
        })
    );
}

/** Push latest RealView rows to Ably (used after cash-out/bust and by bot). */
export async function publishAlphaTreeViewFeed(ably) {
    if (!ably) return;
    try {
        const views = await AlphaTreeView.find()
            .sort({ createdAt: -1 })
            .limit(VIEW_LIMIT);
        const data = await enrichAlphaTreeViewsWithUser(views);
        await ably.channels
            .get("alphaTreeGame")
            .publish("alphaTreeUpdate", { updatedData: data });
    } catch (err) {
        console.error("[alphaTree] Ably publish error:", err);
    }
}
