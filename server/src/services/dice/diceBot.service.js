import cron from "node-cron";
import User from "../../models/User.js";
import DiceView from "../../models/DiceView.js";

export const diceBot = async (ably) => {
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
                
                const bet = randomItem([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1, 1, 1, 1, 1, 1, 0.2, 0.2, 0.2, 0.4, 0.4, 0.4, 0.8, 1.6, 3.2, 10, 20]);
                const win = randomItem([1.97, 1.97, 1.97, 0, 0]);
                
                const diceView = new DiceView({
                    userId: randomBot.userId,
                    bet: bet,
                    dice: 0,
                    type: 0,
                    win: win * bet,
                    totalBet: 0,
                    totalWin: 0,
                    diceBalance: 0,
                    isUser: 0,
                    time: new Date(),
                })
                
                await diceView.save();
                const oldDocs = await DiceView.find({isUser:  0})
                    .sort({ time: -1 })
                    .skip(12)
                    .select('_id');

                if (oldDocs.length > 0) {
                    await DiceView.deleteMany({
                        _id: { $in: oldDocs.map(doc => doc._id) }
                    });
                }

                const channel = ably.channels.get("diceGame");
                const diceViewUpdate = await DiceView.find().sort({ time: -1 }).limit(12);
                
                const updatedData = await Promise.all(
                    diceViewUpdate.map(async (item) => {
                        const user = await User.findOne({ userId: item.userId });
                        
                        const obj = item.toObject();
                        delete obj.isUser;
                        delete obj.totalBet;
                        delete obj.totalWin;
                        delete obj.diceBalance;
                        
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

                channel.publish("diceUpdate", { updatedData }).catch(err => {
                    console.error("❌ [diceController] Error publishing to Ably:", err);
                });
            }
        },
        { scheduled: true }
    );
};
