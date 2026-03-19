import cron from "node-cron";
import User from "../../models/User.js";
import MiningSettings from "../../models/MiningSettings.js";
import MiningResult from "../../models/MiningResult.js";

const MIN_TURNS = 1;
const MAX_TURNS = 8;

const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.05 },
];

function getMultiplier(turns) {
    if (turns < MIN_TURNS || turns > MAX_TURNS) return 0;
    return 16 / turns;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

export const miningBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const miningSetting = await MiningSettings.findOne({});
        if (!miningSetting) return;
        if (Math.random() >= miningSetting.botTriggerProbability) {
            return;
        } 
        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const turn = randomInt(MIN_TURNS, MAX_TURNS);
            const isWin = Math.random() < miningSetting.botWinProbability;

            const multiplier = getMultiplier(turn);
            const winAmount = isWin ? Math.round(betAmount * multiplier * 1000) / 1000 : 0;

            user.totalBet = Math.round((user.totalBet + betAmount) * 1000) / 1000;
            if (isWin) {
                user.totalEarn = Math.round((user.totalEarn + winAmount) * 1000) / 1000;
            }
            await user.save();

            await MiningResult.create({
                userName: user.altas,
                avatar: user.avatar,
                bet: betAmount,
                isWin,
                turn,
                win: winAmount,
                date: new Date(),
            });

            const recent = await MiningResult.find()
                .sort({ date: -1 })
                .limit(30)
                .select("_id");
            const recentIds = recent.map((doc) => doc._id);
            await MiningResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("miningResult");
                const data = {
                    userName: user.altas,
                    avatar: user.avatar,
                    bet: betAmount,
                    isWin,
                    turn,
                    win: winAmount,
                    date: new Date(),
                };
                await channel.publish("MINING_RESULT", data);
            }
        } catch (err) {
            console.error("❌ [miningBot] Error:", err);
        }
    });
};
