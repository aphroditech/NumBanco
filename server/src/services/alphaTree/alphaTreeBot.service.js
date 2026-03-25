import cron from "node-cron";
import User from "../../models/User.js";
import AlphaTreeView from "../../models/AlphaTreeView.js";
import { calculateAlphaTreeBot } from "./calculateAlphaTreeBot.js";
import { publishAlphaTreeViewFeed } from "./alphaTreeViewFeed.js";

/**
 * Periodically inserts fake Alpha Tree RealView rows (random non-partner users) + Ably update.
 * Same pattern as cocoBot.service.js
 */
export const alphaTreeBot = async (ably) => {
    cron.schedule(
        "* * * * * *",
        async () => {
            try {
                if (Math.random() < 0.45) {
                    const [randomBot] = await User.aggregate([
                        { $match: { partnerLevel: 0 } },
                        { $sample: { size: 1 } },
                        { $project: { userId: 1 } },
                    ]);

                    if (!randomBot?.userId) return;

                    const { bet, result, win } = calculateAlphaTreeBot();

                    await AlphaTreeView.create({
                        userId: randomBot.userId,
                        bet,
                        win,
                        result,
                        isUser: 0,
                    });

                    const recent = await AlphaTreeView.find()
                        .sort({ createdAt: -1 }) // newest first
                        .limit(30)
                        .select("_id");

                    const recentIds = recent.map(doc => doc._id);

                    await AlphaTreeView.deleteMany({
                        _id: { $nin: recentIds }
                    });

                    await publishAlphaTreeViewFeed(ably);
                }
            } catch (err) {
                console.error("❌ [alphaTreeBot] tick error:", err);
            }
        },
        { scheduled: true }
    );
};
