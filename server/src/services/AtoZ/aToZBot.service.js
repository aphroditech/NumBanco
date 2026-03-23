import cron from "node-cron";
import User from "../../models/User.js";
import AToZSetting from "../../models/AToZSetting.js";
import AToZResult from "../../models/AToZResult.js";

/** Similar bet spread to `rocketBot.service.js` / Rocket Shot UI */
const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.05 },
];

const WIN_OUTCOME_KEYS = [
    "THREE_ORDERED",
    "THREE_UNORDERED",
    "TWO_ORDERED",
    "TWO_UNORDERED",
    "ONE_ORDERED",
    "ONE_UNORDERED",
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

/**
 * Weighted pick among winning outcome keys (excludes NONE), aligned with
 * `getOutcomeKey` / multiplier table in `aToZController.js`.
 */
function pickWinningMultiplier(aToZSetting) {
    const rows = WIN_OUTCOME_KEYS.map((key) => ({
        key,
        probability: aToZSetting[key]?.probability ?? 0,
        multiplier: aToZSetting[key]?.multiplier ?? 0,
    })).filter((row) => row.probability > 0 && row.multiplier > 0);

    if (!rows.length) {
        return 0;
    }

    const totalWeight = rows.reduce((sum, row) => sum + row.probability, 0);
    let random = Math.random() * totalWeight;

    for (const row of rows) {
        if (random < row.probability) {
            return row.multiplier;
        }
        random -= row.probability;
    }

    return rows[rows.length - 1].multiplier;
}

export const aToZBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const aToZSetting = await AToZSetting.findOne();
        if (!aToZSetting) return;
        if (Math.random() >= aToZSetting.botTriggerProbability) {
            return;
        }

        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const isWin = Math.random() < aToZSetting.botWiningProbability;

            let multiplier = 0;
            if (isWin) {
                multiplier = pickWinningMultiplier(aToZSetting);
            }

            const winAmount =
                multiplier > 0
                    ? Math.round(betAmount * multiplier * 1000) / 1000
                    : 0;

            user.totalBet = Math.round((user.totalBet + betAmount) * 1000) / 1000;
            if (winAmount > 0) {
                user.totalEarn = Math.round((user.totalEarn + winAmount) * 1000) / 1000;
            }
            await user.save();

            const data = {
                userName: user.altas,
                avatar: user.avatar,
                isWin: multiplier > 0,
                multiplier,
                betAmount,
                winAmount,
                date: new Date(),
            };
            await AToZResult.create(data);

            const recent = await AToZResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((doc) => doc._id);
            await AToZResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("aToZResult");
                await channel.publish("A_TO_Z_RESULT", data);
            }
        } catch (err) {
            console.error("❌ [aToZBot] Error:", err);
        }
    });
};
