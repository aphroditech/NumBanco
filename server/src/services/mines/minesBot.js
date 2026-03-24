import cron from "node-cron";
import User from "../../models/User.js";
import MinesResult from "../../models/MinesResult.js";
import MinesSetting from "../../models/MinesSetting.js";
import { getMultiplierForRevealed, GRID_SIZE, MODES } from "./minesGame.service.js";

// Bet amount ranges (min, max) and their probability (0–1). Clamp to Mines max bet ($20).
const BET_AMOUNT_RANGES = [
    { min: 0.1, max: 3, probability: 0.4 },
    { min: 3, max: 10, probability: 0.35 },
    { min: 10, max: 20, probability: 0.25 },
];

const MODE_KEYS = ["easy", "normal", "hard", "ace"];

function randomInArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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

/** Pick a random multiplier using the same fixed tables as real games (easy/normal/hard/ace). */
function randomMultiplierFromTables() {
    const modeKey = randomInArray(MODE_KEYS);
    const minesCount = MODES[modeKey];
    const safeTiles = GRID_SIZE - minesCount;
    const revealedCount = 1 + Math.floor(Math.random() * safeTiles);
    const multiplier = getMultiplierForRevealed(GRID_SIZE, minesCount, revealedCount);
    return multiplier;
}

export const minesBot = async (ably) => {
    const botUsers = await User.find({ partnerLevel: 0 });
    if (!botUsers?.length) return;

    cron.schedule("* * * * * *", async () => {
        const minesSetting = await MinesSetting.findOne({});
        if (!minesSetting) return;

        // Trigger when random falls within configured probability.
        if (Math.random() >= minesSetting.botTriggerProbability) return;

        try {
            const botUser = randomInArray(botUsers);
            const user = await User.findOne({ userId: botUser.userId });
            if (!user) return;

            const betAmount = randomBetAmount();

            const isWin = Math.random() < minesSetting.botWinProbability;

            let winAmount = 0;
            let multiplier = 0;

            if (isWin) {
                multiplier = randomMultiplierFromTables();
                winAmount = Math.round(betAmount * multiplier * 100) / 100;
            }

            // Save bot round into MinesResult collection
            const doc = await MinesResult.create({
                userName: user.altas,
                avatar: user.avatar,
                isWin,
                betAmount,
                winAmount,
                multiplier,
                createAt: new Date(),
            });

            // Keep only recent 50 bot records
            const recent = await MinesResult.find()
                .sort({ createAt: -1 })
                .limit(50)
                .select("_id");
            const recentIds = recent.map((d) => d._id);
            await MinesResult.deleteMany({ _id: { $nin: recentIds } });

            if (ably) {
                const channel = ably.channels.get("minesResult");
                const data = {
                    userName: doc.userName,
                    avatar: doc.avatar,
                    isWin: doc.isWin,
                    betAmount: doc.betAmount,
                    winAmount: doc.winAmount,
                    multiplier: doc.multiplier,
                    createAt: doc.createAt,
                };
                await channel.publish("MINES_RESULT", data);
            }
        } catch (err) {
            console.error("❌ [minesBot] Error (check save/validation):", err);
        }
    });
};
