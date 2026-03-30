import cron from "node-cron";
import User from "../../models/User.js";
import DiamondView from "../../models/diamond/DiamondView.js";
import { sampleDiamondPayoutFromDb, DIAMOND_MODE_KEYS } from "./diamondSettings.service.js";
import { publishDiamondViewFeed, trimDiamondViewsToMax } from "./diamondViewFeed.js";

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

const MIN_BET = 0.1;
const MAX_BET = 20;

/**
 * Periodically inserts Diamond RealView bot rows (random non-partner users) + Ably update.
 */
export const diamondBot = async (ably) => {
    cron.schedule(
        "* * * * * *",
        async () => {
            try {
                if (Math.random() < 0.35) {
                    const [randomBot] = await User.aggregate([
                        { $match: { partnerLevel: 0 } },
                        { $sample: { size: 1 } },
                        { $project: { altas: 1 } },
                    ]);

                    if (!randomBot?.altas) return;

                    const betAmount = round2(MIN_BET + Math.random() * (MAX_BET - MIN_BET));
                    const botMode = DIAMOND_MODE_KEYS[Math.floor(Math.random() * DIAMOND_MODE_KEYS.length)];
                    const { mult } = await sampleDiamondPayoutFromDb(botMode);
                    const win = round2(betAmount * mult);

                    await DiamondView.create({
                        userName: randomBot.altas,
                        isWin: mult > 0,
                        betAmount,
                        level: Number(mult).toFixed(2),
                        winAmount: win,
                        date: new Date(),
                    });
                    await trimDiamondViewsToMax();

                    await publishDiamondViewFeed(ably);
                }
            } catch (err) {
                console.error("❌ [diamondBot] tick error:", err);
            }
        },
        { scheduled: true }
    );
};
