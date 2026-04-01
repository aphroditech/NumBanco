import cron from "node-cron";
import User from "../../models/User.js";
import RangeSettings from "../../models/range/RangeSettings.js";
import RangeResult from "../../models/range/RangeResult.js";

const HOUSE_FACTOR = 0.97;
const RANGE_MIN = 0;
const RANGE_MAX = 100;
const MIN_SPAN = 1;
const MAX_SPAN = 95;

const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.3 },
    { min: 10, max: 15, probability: 0.1 },
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

function randomRangeBand() {
    const span = randomInt(MIN_SPAN, MAX_SPAN);
    const min = randomInt(RANGE_MIN, RANGE_MAX - span);
    const max = min + span;
    return { min, max, span };
}

// Range uses fairness multiplier: (100 / span) * HOUSE_FACTOR
function getFairnessFromSpan(span) {
    const fairness = (100 / span) * HOUSE_FACTOR;
    return Math.round(fairness * 10000) / 10000;
}

function getWinningProbability(settingsDoc, betAmount, fairness) {
    const amountTier = settingsDoc?.multiple?.find(
        (tier) => betAmount >= Number(tier.minAmount) && betAmount <= Number(tier.maxAmount),
    );
    if (!amountTier?.multipliers?.length) {
        return null;
    }

    const multiplierTier = amountTier.multipliers.find(
        (m) => fairness >= Number(m.minMultiplier) && fairness <= Number(m.maxMultiplier),
    );
    if (!multiplierTier) {
        return null;
    }

    const p = Number(multiplierTier.probability);
    return Number.isFinite(p) ? p : null;
}

export const rangeBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const settingsDoc = await RangeSettings.findOne({}).lean();
        if (!settingsDoc) return;

        const triggerP = Number(settingsDoc.botTriggerProbability);
        const trigger = Number.isFinite(triggerP) ? triggerP : 0.4;
        if (Math.random() >= trigger) {
            return;
        }

        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const { span } = randomRangeBand();
            const fairness = getFairnessFromSpan(span);

            const tierProb = getWinningProbability(settingsDoc, betAmount, fairness);
            const fallbackProb = Number(settingsDoc.botWinningProbability);
            const winProb = Number.isFinite(tierProb)
                ? tierProb
                : Number.isFinite(fallbackProb)
                    ? fallbackProb
                    : 0.5;
            const isWin = Math.random() < winProb;

            const winAmount = isWin
                ? Math.round(betAmount * fairness * 100) / 100
                : 0;

            user.totalBet = Math.round((Number(user.totalBet || 0) + betAmount) * 100) / 100;
            user.rangeAmount = Math.round((Number(user.rangeAmount || 0) + betAmount) * 100) / 100;

            if (isWin && winAmount > 0) {
                user.totalEarn = Math.round((Number(user.totalEarn || 0) + winAmount) * 100) / 100;
                user.rangeWinAmount = Math.round((Number(user.rangeWinAmount || 0) + winAmount) * 100) / 100;
            }
            await user.save();

            const payload = {
                userName: user.altas,
                avatar: user.avatar || "/avatars/pfp1.png",
                isWin,
                multiplier: fairness,
                betAmount,
                winAmount,
                date: new Date(),
            };

            await new RangeResult(payload).save();

            const recent = await RangeResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((doc) => doc._id);
            await RangeResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("rangeResult");
                await channel.publish("RANGE_RESULT", payload);
            }
        } catch (err) {
            console.error("❌ [rangeBot] Error:", err);
        }
    });
};
