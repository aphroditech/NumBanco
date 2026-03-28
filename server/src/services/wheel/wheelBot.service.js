import cron from "node-cron";
import User from "../../models/User.js";
import wheelSettings from "../../models/Wheel/wheelSettings.js";
import WheelResult from "../../models/Wheel/wheelResult.js";

const LEVELS = ["low", "medium", "hard"];

/** Same bet spread as `rocketBot.service.js` / other table bots */
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

/** Mirrors `getMultiplier` in `wheelController.js` */
function pickMultiplierFromLevelSettings(level) {
    let settings = [];
    if(level === "low") {
        settings = [
            { multiplier: 1.48, probability: 10 },
            { multiplier: 1.18, probability: 60 },
            { multiplier: 0.00, probability: 30 },
        ]
    } else if(level === "medium") {
        settings = [
            { multiplier: 1.48, probability: 20 },
            { multiplier: 1.68, probability: 10 },
            { multiplier: 1.97, probability: 20 },
            { multiplier: 2.96, probability: 13.3 },
            { multiplier: 3.95, probability: 3.3 },
            { multiplier: 0.00, probability: 33.3 },
        ]
    } else if(level === "hard") {
        settings = [
            { multiplier: 29.4, probability: 20 },
            { multiplier: 0.00, probability: 80 },
        ]
    }
    const totalWeight = settings.reduce((sum, m) => sum + (Number(m.probability) || 0), 0);
    if (totalWeight <= 0 || !settings.length) {
        return 0;
    }

    let random = Math.random() * totalWeight;
    for (const m of settings) {
        const p = Number(m.probability) || 0;
        if (random < p) {
            return Number(m.multiplier) || 0;
        }
        random -= p;
    }

    const last = settings[settings.length - 1];
    return Number(last?.multiplier) || 0;
}

/**
 * Periodically simulates wheel spins for bot users (`partnerLevel: 0`),
 * updates aggregate stats (no real balance debit/credit), persists `WheelResult`,
 * and publishes `WHEEL_RESULT` on Ably (`wheelResult` channel) for the live feed.
 *
 * @param {import("ably").Realtime | null | undefined} ably — same client as `req.app.locals.ably` (core)
 */
export const wheelBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const doc = await wheelSettings.findOne({}).lean();
        if (!doc) return;

        const triggerP = Number(doc.botTriggerProbability);
        const trigger = Number.isFinite(triggerP) ? triggerP : 0.4;
        if (Math.random() >= trigger) {
            return;
        }

        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();
            const level = randomLevel();
            const levelSettings = doc[level];
            if (!Array.isArray(levelSettings) || levelSettings.length === 0) {
                return;
            }

            const winP = Number(doc.botWinningProbability);
            const winProb = Number.isFinite(winP) ? winP : 0.5;
            const rollWin = Math.random() < winProb;

            let multiplier = rollWin ? pickMultiplierFromLevelSettings(level) : 0;
            const winAmount =
                rollWin && multiplier > 0
                    ? Math.round(betAmount * multiplier * 100) / 100
                    : 0;

            const isWin = winAmount > 0;

            user.totalBet = Math.round((Number(user.totalBet || 0) + betAmount) * 100) / 100;
            if (isWin) {
                user.totalEarn = Math.round((Number(user.totalEarn || 0) + winAmount) * 100) / 100;
                user.wheelWinAmount = Math.round(
                    (Number(user.wheelWinAmount || 0) + winAmount) * 100,
                ) / 100;
            }
            user.wheelAmount = Math.round(
                (Number(user.wheelAmount || 0) + betAmount) * 100,
            ) / 100;
            await user.save();

            const payload = {
                userName: user.altas,
                avatar: user.avatar || "/avatars/pfp1.png",
                isWin,
                level,
                multiplier,
                betAmount,
                winAmount,
                date: new Date(),
            };

            await new WheelResult(payload).save();

            const recent = await WheelResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((d) => d._id);
            await WheelResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("wheelResult");
                await channel.publish("WHEEL_RESULT", {
                    userName: payload.userName,
                    avatar: payload.avatar,
                    isWin: payload.isWin,
                    betAmount: payload.betAmount,
                    winAmount: payload.winAmount,
                    multiplier: payload.multiplier,
                });
            }
        } catch (err) {
            console.error("❌ [wheelBot] Error:", err);
        }
    });
};
