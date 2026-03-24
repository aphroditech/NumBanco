import cron from "node-cron";
import User from "../../models/User.js";
import CardGameView from "../../models/CardGameView.js";

export const cardGameBot = async (ably) => {
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
                const multi = randomItem([0.6, 0.6, 5, 5, 5, 5, 5, 5, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                
                const cardGameView = new CardGameView({
                    userId: randomBot.userId,
                    bet: bet,
                    arrow: '=',
                    left: 0,
                    right: 0,
                    win: bet*multi,
                    totalBet: 0,
                    totalWin: 0,
                    cardGameBalance: 0,
                    isUser: 0,
                    time: new Date(),
                })
                
                await cardGameView.save();
                const oldDocs = await CardGameView.find({isUser:  0})
                    .sort({ time: -1 })
                    .skip(12)
                    .select('_id');

                if (oldDocs.length > 0) {
                    await CardGameView.deleteMany({
                        _id: { $in: oldDocs.map(doc => doc._id) }
                    });
                }

                const channel = ably.channels.get("cardGame");
                const cardGameViewUpdate = await CardGameView.find().sort({ time: -1 }).limit(12);
                
                const updatedData = await Promise.all(
                    cardGameViewUpdate.map(async (item) => {
                        const user = await User.findOne({ userId: item.userId });
                        
                        const obj = item.toObject();
                        delete obj.isUser;
                        delete obj.totalBet;
                        delete obj.totalWin;
                        delete obj.cardGameBalance;
                        
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

                channel.publish("cardGameUpdate", { updatedData }).catch(err => {
                    console.error("❌ [cardGameController] Error publishing to Ably:", err);
                });
            }
        },
        { scheduled: true }
    );
};
