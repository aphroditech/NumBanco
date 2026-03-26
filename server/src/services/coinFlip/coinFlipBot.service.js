import cron from "node-cron";
import User from "../../models/User.js";
import CoinSettings from "../../models/coin/CoinSettings.js";
import CoinResult from "../../models/coin/CoinResult.js";

/** Similar bet spread to `rocketBot.service.js` / Rocket Shot UI */
const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.05 },
];

function randomBetAmount() {
    const r = Math.random();
    let acc = 0;
    let range = BET_AMOUNT_RANGES[0];
    for (const tier of BET_AMOUNT_RANGES) {
        acc += tier.probability;
        if (r < acc) {
            range = tier;
            break;
        }
    }
    const amount = range.min + Math.random() * (range.max - range.min);
    return Math.round(amount * 100) / 100;
}

export const coinFlipBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const coinSettings = await CoinSettings.findOne();
        if (!coinSettings) return;
        if (Math.random() >= coinSettings.botTriggerProbability) {
            return;
        }

        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const flip = Math.random() < 0.5 ? 1 : 0;
            const isWin = Math.random() < coinSettings.botWinProbability;

            const result = isWin ? flip : !flip;
            const winAmount = isWin ? betAmount*1.95 : 0;

            user.totalBet = Math.round((user.totalBet + betAmount) * 1000) / 1000;
            if (isWin) {
                user.balance = Math.round((user.balance + winAmount) * 1000) / 1000;
                user.totalEarn = Math.round((user.totalEarn + winAmount) * 1000) / 1000;
                user.coinWinAmount = Math.round((user.coinWinAmount + winAmount) * 1000) / 1000;
            }
            await user.save();

            const data = {
                userName: user.altas,
                avatar: user.avatar,
                isWin: isWin,
                flip: flip,
                result: result,
                betAmount,
                winAmount: winAmount,
                date: new Date(),
            };
            const newResult = new CoinResult(data);
            await newResult.save();

            const recent = await CoinResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((doc) => doc._id);
            await CoinResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("coinFlipResult");
                await channel.publish("COIN_FLIP_RESULT", data);
            }
        } catch (err) {
            console.error("❌ [coinFlipBot] Error:", err);
        }
    });
};