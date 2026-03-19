import cron from "node-cron";
import User from "../../models/User.js";
import RocketSettings from "../../models/RocketSettings.js";
import RocketResult from "../../models/RocketResult.js";
import RocketHistory from "../../models/RocketHistory.js";

const LEVELS = ["easy", "normal", "hard"];

const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.05 },
];

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

function randomLevel() {
    return LEVELS[randomInt(0, LEVELS.length - 1)];
}

/** Same weighted pick as `getMultiplier` in rocketController */
function pickMultiplierFromSettings(settings) {
    const multipliers = settings?.multiple;
    if (!multipliers?.length) return 0;

    const totalWeight = multipliers.reduce((sum, m) => sum + m.probability, 0);
    let random = Math.random() * totalWeight;

    for (const m of multipliers) {
        if (random < m.probability) {
            return m.number;
        }
        random -= m.probability;
    }
    return 0;
}

/** Match rocketController `bet` level scaling */
function applyLevelToMultiplier(multiplier, level) {
    let m = multiplier;
    if (level === "normal") {
        m *= 1100;
        m /= 1000;
    } else if (level === "hard") {
        m *= 1200;
        m /= 1000;
    }
    return m;
}

export const rocketBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const rocketSettings = await RocketSettings.findOne({});
        if (!rocketSettings) return;
        if (Math.random() >= rocketSettings.botTriggerProbability) {
            return;
        }

        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const level = randomLevel();
            const isWin = Math.random() < rocketSettings.botWinProbability;

            let multiplier = pickMultiplierFromSettings(rocketSettings);
            multiplier = applyLevelToMultiplier(multiplier, level);
            const winAmount = isWin
                ? Math.round(betAmount * multiplier * 1000) / 1000
                : 0;

            user.totalBet = Math.round((user.totalBet + betAmount) * 1000) / 1000;
            if (isWin) {
                user.totalEarn = Math.round((user.totalEarn + winAmount) * 1000) / 1000;
            }
            await user.save();

            const historyEntry = {
                isWin,
                level,
                betAmount,
                winAmount,
                date: new Date(),
            };

            let rocketHistory = await RocketHistory.findOne({ user: user._id });
            if (!rocketHistory) {
                rocketHistory = new RocketHistory({
                    user: user._id,
                    history: [historyEntry],
                });
            } else {
                rocketHistory.history.push(historyEntry);
            }
            await rocketHistory.save();

            const data = {
                userName: user.altas,
                avatar: user.avatar,
                isWin,
                bet: betAmount,
                win: winAmount,
                date: new Date(),
            };
            await RocketResult.create(data);

            const recent = await RocketResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((doc) => doc._id);
            await RocketResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("rocketResult");
                await channel.publish("ROCKET_RESULT", data);
            }
        } catch (err) {
            console.error("❌ [rocketBot] Error:", err);
        }
    });
};
