import User from "../../models/User.js";
import TwistView from "../../models/TwistView.js";

export const VIEW_LIMIT = 22;

export async function enrichTwistViewsWithUser(views) {
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

/** Push latest RealView rows to Ably (used after outcome and by bot). */
export async function publishTwistViewFeed(ably) {
    if (!ably) return;
    try {
        const views = await TwistView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichTwistViewsWithUser(views);
        await ably.channels.get("twistGame").publish("twistUpdate", { updatedData: data });
    } catch (err) {
        console.error("[twist] Ably publish error:", err);
    }
}

