import cron from "node-cron";
import User from "../../models/User.js";
import ClimbView from "../../models/ClimbView.js";
import { calculateClimbBot } from "./calculateClimbBot.js";
import { publishClimbViewFeed } from "./climbViewFeed.js";
import { getClimbSettingsMerged } from "./climbSettings.service.js";

/**
 * Periodically inserts Climb RealView bot rows (random non-partner users) + Ably update.
 */
export const climbBot = async (ably) => {
    cron.schedule(
        "* * * * * *",
        async () => {
            try {
                if (Math.random() < 0.35) {
                    const [randomBot] = await User.aggregate([
                        { $match: { partnerLevel: 0 } },
                        { $sample: { size: 1 } },
                        { $project: { userId: 1 } },
                    ]);

                    if (!randomBot?.userId) return;

                    const merged = await getClimbSettingsMerged();
                    const { bet, result, win, mode } = calculateClimbBot(merged);

                    await ClimbView.create({
                        userId: randomBot.userId,
                        bet,
                        win,
                        result,
                        mode,
                        symbol: "bot",
                        isUser: 0,
                    });

                    const recent = await ClimbView.find().sort({ createdAt: -1 }).limit(30).select("_id");
                    const recentIds = recent.map((doc) => doc._id);
                    await ClimbView.deleteMany({ _id: { $nin: recentIds } });

                    await publishClimbViewFeed(ably);
                }
            } catch (err) {
                console.error("❌ [climbBot] tick error:", err);
            }
        },
        { scheduled: true }
    );
};
