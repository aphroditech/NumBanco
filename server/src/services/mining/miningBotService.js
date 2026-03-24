import cron from "node-cron";
import User from "../../models/User.js";
import MiningSettings from "../../models/jackal/MiningSettings.js";
import MiningResult from "../../models/jackal/MiningResult.js";

const MIN_TURNS = 1;
const MAX_TURNS = 8;
/** Matches `MULTIPLIER_DECAY` in client `Mining.js` — each safe flip scales payout by this factor. */
const MULTIPLIER_DECAY = 0.8;

const BET_AMOUNT_RANGES = [
    { min: 0.5, max: 2, probability: 0.3 },
    { min: 2, max: 6, probability: 0.25 },
    { min: 6, max: 10, probability: 0.2 },
    { min: 10, max: 15, probability: 0.2 },
    { min: 15, max: 20, probability: 0.05 },
];

function getMaxMultiplier(maxTurns) {
    if (maxTurns < MIN_TURNS || maxTurns > MAX_TURNS) return 0;
    return 16 / maxTurns;
}

/**
 * Same as frontend `getEffectiveMultiplier` in `Mining.js`:
 * effective = (16 / maxTurns) * DECAY^(currentTurn - 1), where currentTurn is 1-based flip on which the jackal is found.
 */
function getEffectiveMultiplier(maxTurns, currentTurn) {
    const maxMult = getMaxMultiplier(maxTurns);
    if (maxMult <= 0 || currentTurn < 1 || currentTurn > maxTurns) return 0;
    return maxMult * MULTIPLIER_DECAY ** (currentTurn - 1);
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
            /** Max flips (1–8), same meaning as `turn` in `MiningResult` / frontend `maxTurns`. */
            const maxTurns = randomInt(MIN_TURNS, MAX_TURNS);
            const isWin = Math.random() < miningSetting.botWinProbability;

            let multiplier = 0;
            let winAmount = 0;
            if (isWin) {
                const currentTurn = randomInt(1, maxTurns);
                const rawMult = getEffectiveMultiplier(maxTurns, currentTurn);
                multiplier = Math.round(rawMult * 100) / 100;
                winAmount = Math.round(betAmount * multiplier * 1000) / 1000;
                user.totalEarn = Math.round((user.totalEarn + winAmount) * 1000) / 1000;
                user.miningWinAmount = Math.round((user.miningWinAmount + winAmount) * 1000) / 1000;
            }
            user.totalBet = Math.round((user.totalBet + betAmount) * 1000) / 1000;
            await user.save();

            await MiningResult.create({
                userName: user.altas,
                avatar: user.avatar,
                bet: betAmount,
                isWin,
                multiplier,
                turn: maxTurns,
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
                    multiplier,
                    turn: maxTurns,
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
