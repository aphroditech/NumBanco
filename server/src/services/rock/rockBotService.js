import cron from "node-cron";
import User from "../../models/User.js";
import RockSettings from "../../models/rock/rockSettings.js";
import RockResult from "../../models/rock/rockResult.js";

const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.3 },
    { min: 10, max: 15, probability: 0.1 },
    { min: 15, max: 20, probability: 0.05 },
];


const CARD_INDEX_BUCKETS = [
    { min: 1, max: 3, probability: 0.5 },
    { min: 4, max: 5, probability: 0.25 },
    { min: 6, max: 8, probability: 0.25 },
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

function randomCardIndex() {
    const r = Math.random();
    let acc = 0;
    let bucket = CARD_INDEX_BUCKETS[0];
    for (const b of CARD_INDEX_BUCKETS) {
        acc += b.probability;
        if (r < acc) {
            bucket = b;
            break;
        }
    }
    return Math.floor(Math.random() * (bucket.max - bucket.min + 1)) + bucket.min;
}

function getMultiplierForCard(n) {
    const m = 1 + 1.1 * n + 0.05 * n * n;
    return Math.round(m * 100) / 100;
}

function getRtpForBet(settingsDoc, betAmount) {
    const tier = settingsDoc?.multiplier?.find(
        (m) => betAmount >= Number(m.minAmount) && betAmount <= Number(m.maxAmount),
    );
    const rtp = Number(tier?.RTPPercentage);
    return Number.isFinite(rtp) ? rtp : null;
}

/**
 * Bot feed for Rock game.
 * - Uses trigger probability from RockSettings (fallback 0.4)
 * - Uses botWinProbability first, then RTP/multiplier derived chance, then fallback 0.5
 */
export const rockBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const settingsDoc = await RockSettings.findOne({}).lean();
        if (!settingsDoc) return;

        const triggerP = Number(settingsDoc.botTriggerProbability);
        const trigger = Number.isFinite(triggerP) ? triggerP : 0.4;
        if (Math.random() >= trigger) return;

        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const cardIndex = randomCardIndex();
            const multiplier = getMultiplierForCard(cardIndex);

            const explicitWinP = Number(settingsDoc.botWinProbability);
            const rtp = getRtpForBet(settingsDoc, betAmount);
            const rtpDerivedWinP = Number.isFinite(rtp) ? Math.min(Math.max(rtp / multiplier, 0), 1) : null;
            const winProb = Number.isFinite(explicitWinP)
                ? explicitWinP
                : Number.isFinite(rtpDerivedWinP)
                    ? rtpDerivedWinP
                    : 0.5;

            const isWin = Math.random() < winProb;
            const winAmount = isWin ? Math.round(betAmount * multiplier * 100) / 100 : 0;

            user.totalBet = Math.round((Number(user.totalBet || 0) + betAmount) * 100) / 100;
            user.rockAmount = Math.round((Number(user.rockAmount || 0) + betAmount) * 100) / 100;
            if (isWin && winAmount > 0) {
                user.totalEarn = Math.round((Number(user.totalEarn || 0) + winAmount) * 100) / 100;
                user.rockWinAmount = Math.round((Number(user.rockWinAmount || 0) + winAmount) * 100) / 100;
            }
            await user.save();

            const payload = {
                userName: user.altas,
                avatar: user.avatar || "/avatars/pfp1.png",
                isWin,
                multiplier,
                betAmount,
                winAmount,
                date: new Date(),
            };

            await new RockResult(payload).save();

            const recent = await RockResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((doc) => doc._id);
            await RockResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("rockResult");
                await channel.publish("ROCK_RESULT", payload);
            }
        } catch (err) {
            console.error("❌ [rockBot] Error:", err);
        }
    });
};
