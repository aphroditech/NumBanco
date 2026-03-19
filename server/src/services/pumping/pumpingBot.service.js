import cron from "node-cron";
import User from "../../models/User.js";
import PumpingView from "../../models/PumpingView.js";
import { calculatePumping } from "./calculatePumping.js";

export const pumpingBot = async (ably) => {
    cron.schedule(
        "* * * * * *", // every 1 second (cron minimum)
        async () => {
            if(Math.random() < 0.5 ? 1 : 0 == 1) {
                const [randomBot] = await User.aggregate([
                    { $match: { partnerLevel: 0 } },
                    { $sample: { size: 1 } },
                    { $project: { userId: 1 } }
                ]);
                if (!randomBot) return;
                const result = await calculatePumping(1);
                const target = await calculatePumping(1);
                const bet = await calculatePumping(1);
                const win = result > target ? target * bet : 0;
                const pumpingView = new PumpingView({
                    userId: randomBot.userId,
                    target: target,
                    bet: bet,
                    win: win,
                    result: result,
                    totalBet: 0,
                    totalWin: 0,
                    pumpingBalance: 0,
                    isUser: 0,
                })
                await pumpingView.save();
                const channel = ably.channels.get("pumpingGame");
                const pumpingViewUpdate = await PumpingView.find().sort({ createdAt: -1 }).limit(12);
                
                const updatedData = await Promise.all(
                    pumpingViewUpdate.map(async (item) => {
                        const user = await User.findOne({ userId: item.userId });
                        
                        const obj = item.toObject();
                        delete obj.isUser;
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
                channel.publish("pumpingUpdate", { updatedData }).catch(err => {
                    console.error("❌ [pumpingController] Error publishing to Ably:", err);
                });
            }
        },
        { scheduled: true }
    );
};
