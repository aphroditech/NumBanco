import cron from "node-cron";
import User from "../../models/User.js";
import CryptoCrashView from "../../models/CryptoCrashView.js";

export const cryptoCrashBot = async (ably) => {
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
                const multi = randomItem([1.98, 1.98, 1.98, 1.98, 1.98*1.98, 1.98*1.98, 1.98*1.98, 1.98*1.98*1.98, 1.98*1.98*1.98, 1.98*1.98*1.98*1.98, 1.98*1.98*1.98*1.98, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // 0, 0, 0, 0, 0]);
                
                const cryptoCrashView = new CryptoCrashView({
                    userId: randomBot.userId,
                    bet: bet,
                    win: bet*multi,
                    step: 0,
                    multi: multi,
                    totalBet: 0,
                    totalWin: 0,
                    cryptoCrashBalance: 0,
                    isUser: 0,
                    status: 'bot',
                    time: new Date(),
                })
                
                await cryptoCrashView.save();
                const oldDocs = await CryptoCrashView.find({isUser:  0})
                    .sort({ time: -1 })
                    .skip(12)
                    .select('_id');

                if (oldDocs.length > 0) {
                    await CryptoCrashView.deleteMany({
                        _id: { $in: oldDocs.map(doc => doc._id) }
                    });
                }

                // Keep channel name consistent with real broadcast + frontend subscription.
                const channel = ably.channels.get("cryptoCrashGame");
                const cryptoCrashViewUpdate = await CryptoCrashView.find().sort({ time: -1 }).limit(12);
                
                const updatedData = await Promise.all(
                    cryptoCrashViewUpdate.map(async (item) => {
                        const user = await User.findOne({ userId: item.userId });
                        
                        const obj = item.toObject();
                        delete obj.isUser;
                        delete obj.totalBet;
                        delete obj.totalWin;
                        delete obj.cryptoCrashBalance;
                        
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

                channel.publish("cryptoCrashUpdate", { updatedData }).catch(err => {
                    console.error("❌ [cryptoCrashController] Error publishing to Ably:", err);
                });
            }
        },
        { scheduled: true }
    );
};
