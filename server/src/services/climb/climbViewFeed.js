import User from "../../models/User.js";
import ClimbView from "../../models/ClimbView.js";

export const CLIMB_VIEW_LIMIT = 22;

export async function enrichClimbViewsWithUser(views) {
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

export async function publishClimbViewFeed(ably) {
    if (!ably) return;
    try {
        const views = await ClimbView.find().sort({ createdAt: -1 }).limit(CLIMB_VIEW_LIMIT);
        const data = await enrichClimbViewsWithUser(views);
        await ably.channels.get("climbGame").publish("climbUpdate", { updatedData: data });
    } catch (err) {
        console.error("[climb] Ably publish error:", err);
    }
}
