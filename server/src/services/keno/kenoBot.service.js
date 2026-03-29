import cron from "node-cron";
import User from "../../models/User.js";
import KenoView from "../../models/KenoView.js";

export const kenoBot = async (ably) => {
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
                const multi = randomItem([
                    0.69,1.83,0,1.97,3.76,0,1.08,1.36,25.73,0,0,2.17,7.82,89.09,0,0,1.48,4.15,12.86,296.96,
                    0,0,1.08,1.97,6.13,98.98,692.92,0,1.58,3.46,0,1.08,14.84,222.72,692.92,
                    0,0,1.08,1.48,1.97,5.44,38.6,98.98,
                    0,0,1.08,1.28,1.68,2.47,7.42,49.49,
                    0,0,1.08,1.18,1.28,1.78,3.46,12.86,49.49,
                    0,3.92,0,1.88,4.45,0,0.98,3.06,10.29,0,0.79,1.78,4.94,22.27,
                    0,0.24,1.38,4.05,16.33,35.63,
                    0,0,0.98,3.64,6.92,16.33,39.59,
                    0,0,0.46,2.96,4.45,13.85,30.68,59.39,
                    0,0,0,2.17,3.95,12.86,2.77,54.44,69.29,
                    0,0,0,1.53,2.96,7.91,14.84,43.55,59.39,84.14,
                    0,0,0,1.38,2.22,4.45,7.91,16.82,49.49,79.19,98.98,
                    0.39,2.72,0,1.78,5.04,0,0,2.77,49.49,
                    0,0,1.68,9.89,98.98,
                    0,0,1.38,3.95,13.85,
                    0,0,0,2.96,8.9,
                    0,0,0,1.97,6.92,29.69,
                    0,0,0,1.97,3.95,10.88,66.32,
                    0,0,0,1.97,2.47,4.94,14.84,98.98,
                    0,0,0,1.58,1.97,3.95,6.92,25.73,98.98,
                    0,3.92,0,0,16.92,0,0,0,80.67,
                    0,0,0,9.89,
                    0,0,0,4.45,
                    0,0,0,0,10.88,
                    0,0,0,0,6.92,89.09,
                    0,0,0,0,4.94,19.79,
                    0,0,0,0,3.95,10.88,
                    0,0,0,0,3.46,7.91
                ]);
                
                const kenoView = new KenoView({
                    userId: randomBot.userId,
                    bet: bet,
                    type: 0,
                    numbersLength: 0,
                    winLength: 0,
                    win: bet*multi,
                    totalBet: 0,
                    totalWin: 0,
                    kenoBalance: 0,
                    isUser: 0,
                    time: new Date(),
                })
                
                await kenoView.save();
                const oldDocs = await KenoView.find({isUser:  0})
                    .sort({ time: -1 })
                    .skip(12)
                    .select('_id');

                if (oldDocs.length > 0) {
                    await KenoView.deleteMany({
                        _id: { $in: oldDocs.map(doc => doc._id) }
                    });
                }

                const channel = ably.channels.get("kenoGame");
                const kenoViewUpdate = await KenoView.find().sort({ time: -1 }).limit(12);
                
                const updatedData = await Promise.all(
                    kenoViewUpdate.map(async (item) => {
                        const user = await User.findOne({ userId: item.userId });
                        
                        const obj = item.toObject();
                        delete obj.isUser;
                        delete obj.totalBet;
                        delete obj.totalWin;
                        delete obj.kenoBalance;
                        
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

                channel.publish("kenoUpdate", { updatedData }).catch(err => {
                    console.error("❌ [kenoController] Error publishing to Ably:", err);
                });
            }
        },
        { scheduled: true }
    );
};
