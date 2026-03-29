import cron from "node-cron";
import User from "../../models/User.js";
import SnakesSetting from "../../models/snakes/SnakesSettings.js";
import SnakeResult from "../../models/snakes/SnakeResult.js";

const LEVELS = ["easy", "medium", "hard"];
const RING_LEN = 12;

/** Same bet spread as `wheelBot.service.js` */
const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.05 },
];

/** After a safe roll (not on roll 5), chance the bot “cashes out” early — mirrors player behavior. */
const EARLY_CASHOUT_PROBABILITY = 0.32;

/** Max attempts to align session outcome with `botWinningProbability` (same idea as weighting wins in `wheelBot`). */
const OUTCOME_MATCH_ATTEMPTS = 10;

const BOARD_LOW = [
    { kind: "start" },
    { kind: "multiplier", mult: 2.0 },
    { kind: "multiplier", mult: 1.3 },
    { kind: "multiplier", mult: 1.2 },
    { kind: "multiplier", mult: 1.1 },
    { kind: "multiplier", mult: 1.01 },
    { kind: "snake" },
    { kind: "multiplier", mult: 1.01 },
    { kind: "multiplier", mult: 1.1 },
    { kind: "multiplier", mult: 1.2 },
    { kind: "multiplier", mult: 1.3 },
    { kind: "multiplier", mult: 2.0 },
];

const BOARD_MEDIUM = [
    { kind: "start" },
    { kind: "multiplier", mult: 4.0 },
    { kind: "multiplier", mult: 2.5 },
    { kind: "multiplier", mult: 1.4 },
    { kind: "multiplier", mult: 1.11 },
    { kind: "snake" },
    { kind: "snake" },
    { kind: "snake" },
    { kind: "multiplier", mult: 1.11 },
    { kind: "multiplier", mult: 1.4 },
    { kind: "multiplier", mult: 2.5 },
    { kind: "multiplier", mult: 4.0 },
];

const BOARD_HARD = [
    { kind: "start" },
    { kind: "multiplier", mult: 7.5 },
    { kind: "multiplier", mult: 3.0 },
    { kind: "multiplier", mult: 1.38 },
    { kind: "snake" },
    { kind: "snake" },
    { kind: "snake" },
    { kind: "snake" },
    { kind: "snake" },
    { kind: "multiplier", mult: 1.38 },
    { kind: "multiplier", mult: 3.0 },
    { kind: "multiplier", mult: 7.5 },
];

const BOARDS = {
    easy: BOARD_LOW,
    medium: BOARD_MEDIUM,
    hard: BOARD_HARD,
};

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

function boardForLevel(level) {
    return BOARDS[level] || BOARD_LOW;
}

/**
 * Same logic as `getDiceSum` in `snakesController.js` (including anti-abuse thresholds and typo `probabililty`).
 */
function getDiceSum(level, multiplier, stepSettings) {
    if (level === "easy" && multiplier > 2.5) return 7;
    if (level === "medium" && multiplier > 3.5) return 7;
    if (level === "hard" && multiplier > 4.5) return 7;

    if (!Array.isArray(stepSettings) || stepSettings.length === 0) {
        return 7;
    }

    const totalWeight = stepSettings.reduce((sum, item) => {
        const p = item?.probabililty?.[0];
        if (!p) return sum;
        const w =
            level === "easy"
                ? p.easy
                : level === "medium"
                  ? p.medium
                  : p.hard;
        return sum + Number(w || 0);
    }, 0);

    if (totalWeight <= 0) {
        return 7;
    }

    let random = Math.random() * totalWeight;

    for (const item of stepSettings) {
        const p = item?.probabililty?.[0];
        if (!p) continue;
        const w =
            level === "easy"
                ? Number(p.easy)
                : level === "medium"
                  ? Number(p.medium)
                  : Number(p.hard);
        random -= w;
        if (random < 0) {
            return item.sum;
        }
    }

    return 7;
}

/**
 * Each roll starts from ring index 0 (same as client `runRollSequence(true, diceSum)`).
 * @returns {{ isWin: boolean, multiplier: number, winAmount: number, betAmount: number }}
 */
function simulateSnakesSession(settingsDoc, level, betAmount) {
    const board = boardForLevel(level);
    let totalMult = 1;
    let rollsCompleted = 0;

    for (let step = 1; step <= 5; step++) {
        const stepKey = `step${step}`;
        const stepSettings = settingsDoc[stepKey];
        const diceSum = getDiceSum(level, totalMult, stepSettings);
        const landing = (0 + diceSum - 1 + RING_LEN) % RING_LEN;
        const tile = board[landing];

        if (!tile || tile.kind === "snake") {
            return {
                isWin: false,
                multiplier: 0,
                winAmount: 0,
                betAmount,
            };
        }

        if (tile.kind === "multiplier" && tile.mult != null) {
            totalMult = Math.round(totalMult * tile.mult * 10000) / 10000;
        }

        rollsCompleted += 1;

        if (rollsCompleted >= 5) {
            const winAmount = Math.round(betAmount * totalMult * 100) / 100;
            return {
                isWin: true,
                multiplier: totalMult,
                winAmount,
                betAmount,
            };
        }

        if (Math.random() < EARLY_CASHOUT_PROBABILITY) {
            const winAmount = Math.round(betAmount * totalMult * 100) / 100;
            return {
                isWin: true,
                multiplier: totalMult,
                winAmount,
                betAmount,
            };
        }
    }

    return {
        isWin: false,
        multiplier: 0,
        winAmount: 0,
        betAmount,
    };
}

/**
 * Periodically simulates Snakes rounds for bot users (`partnerLevel: 0`),
 * updates aggregate stats (no real balance debit/credit), persists `SnakeResult`,
 * and publishes `SNAKES_RESULT` on Ably (`snakesResult` channel) for the live feed
 * — same pattern as `wheelBot.service.js` / `snakesController.js` cashOut.
 *
 * @param {import("ably").Realtime | null | undefined} ably — e.g. `ablyCore` (`req.app.locals.ably`)
 */
export const snakeBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const doc = await SnakesSetting.findOne({}).lean();
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

            const winP = Number(doc.botWinningProbability);
            const preferWin = Math.random() < (Number.isFinite(winP) ? winP : 0.5);

            let session = simulateSnakesSession(doc, level, betAmount);
            for (let a = 1; a < OUTCOME_MATCH_ATTEMPTS && session.isWin !== preferWin; a++) {
                session = simulateSnakesSession(doc, level, betAmount);
            }

            const { isWin, multiplier, winAmount } = session;

            user.totalBet = Math.round((Number(user.totalBet || 0) + betAmount) * 100) / 100;
            if (isWin && winAmount > 0) {
                user.totalEarn = Math.round((Number(user.totalEarn || 0) + winAmount) * 100) / 100;
                user.snakesWinAmount = Math.round(
                    (Number(user.snakesWinAmount || 0) + winAmount) * 100,
                ) / 100;
            }
            user.snakesAmount = Math.round(
                (Number(user.snakesAmount || 0) + betAmount) * 100,
            ) / 100;
            await user.save();

            const displayName = user.userName || user.altas || "Player";

            const payload = {
                userName: displayName,
                avatar: user.avatar || "/avatars/pfp1.png",
                isWin,
                multiplier,
                betAmount,
                winAmount,
                date: new Date(),
            };

            await new SnakeResult(payload).save();

            const recent = await SnakeResult.find()
                .sort({ date: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((d) => d._id);
            await SnakeResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("snakesResult");
                await channel.publish("SNAKES_RESULT", {
                    userName: payload.userName,
                    avatar: payload.avatar,
                    isWin: payload.isWin,
                    betAmount: payload.betAmount,
                    winAmount: payload.winAmount,
                    multiplier: payload.multiplier,
                });
            }
        } catch (err) {
            console.error("❌ [snakeBot] Error:", err);
        }
    });
};
