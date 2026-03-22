import cron from "node-cron";
import User from "../../models/User.js";
import RubicResult from "../../models/RubicResult.js";

import RubicSetting from "../../models/RubicSetting.js";

const DICE = [1, 2, 3, 4, 5, 6];

// Bet amount ranges (min, max) and their probability (0–1). User range is $0.1 to $1000.
const BET_AMOUNT_RANGES = [
    { min: 0.1, max: 2, probability: 0.25 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.1 },
];
// Operator selection probability: ">" 45%, "<" 45%, "=" 10%
const OP_PROBABILITY = [
    { op: ">", probability: 0.45 },
    { op: "<", probability: 0.45 },
    { op: "=", probability: 0.1 },
];

// (target, op) combinations that have at least one winning result
const VALID_WIN_COMBOS = [
    ...DICE.slice(0, 5).map((t) => ({ target: t, op: ">" })),   // > 1..5
    ...DICE.map((t) => ({ target: t, op: "=" })),               // = 1..6
    ...DICE.slice(1).map((t) => ({ target: t, op: "<" })),      // < 2..6
];

function checkRubicWin(result, target, op) {
    if (op === ">") return result > target;
    if (op === "=") return result === target;
    if (op === "<") return result < target;
    return false;
}

function calculateRubicWin(betAmount, target, op) {
    const t = typeof target === "number" ? target : parseInt(target, 10);
    if (op === "<") {
        const smallMultipliers = { 1: null, 2: 5, 3: 2.5, 4: 1.95, 5: 1.25, 6: 0.9 };
        const multiplier = smallMultipliers[t];
        if (multiplier == null) return { multiplier: 0, winAmount: 0 };
        return { multiplier, winAmount: betAmount * multiplier };
    }
    if (op === ">") {
        const largeMultipliers = { 1: 0.9, 2: 1.25, 3: 1.95, 4: 2.5, 5: 5, 6: null };
        const multiplier = largeMultipliers[t];
        if (multiplier == null) return { multiplier: 0, winAmount: 0 };
        return { multiplier, winAmount: betAmount * multiplier };
    }
    if (op === "=") {
        return { multiplier: 10, winAmount: betAmount * 10 };
    }
    return { multiplier: 0, winAmount: 0 };
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomInArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns an operator with P(">")=42%, P("<")=42%, P("=")=16%. */
function randomOperator() {
    const r = Math.random();
    let acc = 0;
    for (const { op, probability } of OP_PROBABILITY) {
        acc += probability;
        if (r < acc) return op;
    }
    return OP_PROBABILITY[0].op;
}

/** Returns a bet amount in [$0.1, $1000] with weighted probability by range. */
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

/** Returns { target, operation, result } for a winning outcome. */
function getWinOutcome() {
    const op = randomOperator();
    const combosForOp = VALID_WIN_COMBOS.filter((c) => c.op === op);
    const { target } = randomInArray(combosForOp);
    let result;
    if (op === ">") result = randomInt(target + 1, 6);
    else if (op === "=") result = target;
    else result = randomInt(1, target - 1);
    return { target, operation: op, result };
}

/** Returns { target, operation, result } for a losing outcome. */
function getLoseOutcome() {
    const target = randomInt(1, 6);
    const op = randomOperator();
    const winningResults = DICE.filter((r) => checkRubicWin(r, target, op));
    const losingResults = DICE.filter((r) => !checkRubicWin(r, target, op));
    const result = losingResults.length > 0
        ? randomInArray(losingResults)
        : randomInArray(DICE);
    return { target, operation: op, result };
}

export const rubicBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const rubicSetting = await RubicSetting.findOne({});


        if (Math.random() >= rubicSetting.botTriggerProbability) return;
        try {
            const botUser = botUsers[Math.floor(Math.random() * botUsers.length)];
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();

            const isWin = Math.random() < rubicSetting.botWinProbability;
            const { target, operation } = isWin ? getWinOutcome() : getLoseOutcome();

            let winAmount = 0;
            let multiplier = 0;
            if (isWin) {
                const calc = calculateRubicWin(betAmount, target, operation);
                multiplier = calc.multiplier;
                winAmount = calc.winAmount;
                user.totalEarn = Math.round((user.totalEarn + winAmount) * 1000) / 1000;
            }
            user.totalBet = Math.round((user.totalBet + betAmount) * 1000) / 1000;

            await user.save();

            await RubicResult.create({
                userName: user.altas,
                avatar: user.avatar,
                isWin,
                betAmount,
                winAmount,
                createAt: new Date(),
            });
            const recent = await RubicResult.find()
                .sort({ createAt: -1 }) // newest first
                .limit(30)
                .select("_id");

            const recentIds = recent.map(doc => doc._id);

            await RubicResult.deleteMany({
                _id: { $nin: recentIds }
            });


            if (ably) {
                const channel = ably.channels.get("rubicResult");
                const data = {
                    userName: user.altas,
                    avatar: user.avatar,
                    isWin,
                    betAmount,
                    winAmount,
                    createAt: new Date(),
                };
                await channel.publish("RUBIC_RESULT", data);
            }
        } catch (err) {
            console.error("❌ [rubicBot] Error (check save/validation):", err);
        }
    });
};
