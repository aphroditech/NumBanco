import cron from "node-cron";
import User from "../../models/User.js";
import TarotView from "../../models/tarot/TarotView.js";
import { sampleTarotRound } from "./tarotGame.service.js";
import { publishTarotViewFeed, trimTarotViewsToMax } from "./tarotViewFeed.js";

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

const MIN_BET = 0.1;
const MAX_BET = 20;

/**
 * Periodically inserts Tarot RealView bot rows (random non-partner users) + Ably `tarotGame` update.
 */
export const tarotBot = async (ably) => {
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
                    const { totalMult } = await sampleTarotRound();
                    const win = round2(betAmount * totalMult);

                    await TarotView.create({
                        userName: randomBot.altas,
                        isWin: win > 0,
                        betAmount,
                        result: Number(totalMult).toFixed(2),
                        winAmount: win,
                        date: new Date(),
                    });
                    await trimTarotViewsToMax();

                    await publishTarotViewFeed(ably);
                }
            } catch (err) {
                console.error("❌ [tarotBot] tick error:", err);
            }
        },
        { scheduled: true }
    );
};
