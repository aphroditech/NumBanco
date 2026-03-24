import cron from "node-cron";
import User from "../../models/User.js";
import CocoView from "../../models/CocoView.js";
import { calculateCoco } from "./calculateCoco.js";

export const cocoBot = async (ably) => {
    cron.schedule(
        "* * * * * *", // every 1 second (cron minimum)
        async () => {
            try {
                // 50% chance to generate a bot move each tick
                if (Math.random() < 0.5) {
                    const [randomBot] = await User.aggregate([
                        { $match: { partnerLevel: 0 } },
                        { $sample: { size: 1 } },
                        { $project: { userId: 1 } },
                    ]);

                    if (!randomBot) return;

                    // Use coco game calculator (not pumping)
                    const { bet, win, result } = calculateCoco();

                    await CocoView.create({
                        userId: randomBot.userId,
                        bet,
                        win,
                        result,
                        isUser: 0,
                    });

                    const channel = ably.channels.get("cocoGame");
                    const cocoViewUpdate = await CocoView.find()
                        .sort({ createdAt: -1 })
                        .limit(18);

                    const updatedData = await Promise.all(
                        cocoViewUpdate.map(async (item) => {
                            const user = await User.findOne({ userId: item.userId });

                            const obj = item.toObject();
                            delete obj.isUser;

                            // Keep bot payload consistent with the controller's enrich step.
                            // (CocoView schema does not have these fields, but deleting is harmless.)
                            delete obj.totalBet;
                            delete obj.totalWin;
                            delete obj.pumpingBalance;

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

                    channel
                        .publish("cocoUpdate", { updatedData })
                        .catch((err) => {
                            console.error("❌ [cocoBot] Error publishing to Ably:", err);
                        });
                }
            } catch (err) {
                // Ensure one failed tick doesn't stop the whole cron job silently
                console.error("❌ [cocoBot] tick error:", err);
            }
        },
        { scheduled: true }
    );
};
