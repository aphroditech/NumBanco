import cron from "node-cron";
import User from "../../models/User.js";
import FishingView from "../../models/FishingView.js";

export const fishingBot = async (ably) => {
    cron.schedule(
        "* * * * * *", // every 1 second (cron minimum)
        async () => {
            if(Math.random() < 0.3 ? 1 : 0 == 1) {

                const [randomBot] = await User.aggregate([
                    { $match: { partnerLevel: 0 } },
                    { $sample: { size: 1 } },
                    { $project: { userId: 1 } }
                ]);
                if (!randomBot) return;

                const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];
                
                const bet = randomItem([0.1, 0.1, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 10, 20]);
                const multi = randomItem([0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 10, 20, 13, 17, 13.2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                const step = randomItem([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
                
                const fishingView = new FishingView({
                    userId: randomBot.userId,
                    bet: bet,
                    win: bet*multi,
                    step: step,
                    multi: multi,
                    totalBet: 0,
                    totalWin: 0,
                    fishingBalance: 0,
                    status: 'bot',
                    isUser: 0,
                })

                await fishingView.save();
                const oldDocs = await FishingView.find({isUser:  0})
                    .sort({ createdAt: -1 })
                    .skip(12)
                    .select('_id');

                if (oldDocs.length > 0) {
                    await FishingView.deleteMany({
                        _id: { $in: oldDocs.map(doc => doc._id) }
                    });
                }

                const channel = ably.channels.get("fishingGame");
                const fishingViewUpdate = await FishingView.find().sort({ createdAt: -1 }).limit(12);
                
                const updatedData = await Promise.all(
                    fishingViewUpdate.map(async (item) => {
                        const user = await User.findOne({ userId: item.userId });
                        
                        const obj = item.toObject();
                        delete obj.isUser;
                        delete obj.totalBet;
                        delete obj.totalWin;
                        delete obj.fishingBalance;
                        
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

                channel.publish("fishingUpdate", { updatedData }).catch(err => {
                    console.error("❌ [fishingController] Error publishing to Ably:", err);
                });
            }
        },
        { scheduled: true }
    );
};
