import cron from "node-cron";
import User from "../../models/User.js";
import TwistView from "../../models/TwistView.js";
import { calculateTwistBot } from "./calculateTwistBot.js";
import { publishTwistViewFeed } from "./twistViewFeed.js";

/**
 * Periodically inserts fake Twist RealView rows (random non-partner users) + Ably update.
 */
export const twistBot = async (ably) => {
    cron.schedule(
        "* * * * * *",
        async () => {
            try {
                if (Math.random() < 0.4) {
                    const [randomBot] = await User.aggregate([
                        { $match: { partnerLevel: 0 } },
                        { $sample: { size: 1 } },
                        { $project: { userId: 1 } },
                    ]);

                    if (!randomBot?.userId) return;

                    const { bet, result, win } = calculateTwistBot();

                    await TwistView.create({
                        userId: randomBot.userId,
                        bet,
                        win,
                        result,
                        isUser: 0,
                    });

                    const recent = await TwistView.find()
                        .sort({ createdAt: -1 })
                        .limit(30)
                        .select("_id");
                    const recentIds = recent.map((doc) => doc._id);
                    await TwistView.deleteMany({ _id: { $nin: recentIds } });

                    await publishTwistViewFeed(ably);
                }
            } catch (err) {
                console.error("❌ [twistBot] tick error:", err);
            }
        },
        { scheduled: true }
    );
};

