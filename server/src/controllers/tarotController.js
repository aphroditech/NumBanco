import User from "../models/User.js";
import TarotView from "../models/tarot/TarotView.js";
import { sendUserResponse } from "../utils/responses.js";
import {
    getTarotModeKeyByLevel,
    getTarotModeLevelByRevenue,
    sampleTarotRound,
    getTarotSettingsMerged,
} from "../services/tarot/tarotGame.service.js";
import {
    fetchTarotLivePayload,
    TAROT_LIVE_API_LIMIT,
    publishTarotViewFeed,
    trimTarotViewsToMax,
} from "../services/tarot/tarotViewFeed.js";

const MIN_BET = 0.1;
const MAX_BET = 20;
const TAROT_HISTORY_MAX = 200;
/** Match client reveal end (~REVEAL_INITIAL_MS + 4×REVEAL_STEP_MS) so DB credit aligns with animation. */
const TAROT_CREDIT_DELAY_MS = 3150;

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

async function loadUser(req) {
    return User.findOne(
        { userAuthId: req.user.userAuthId },
        {
            "wallets.eth.privateKey": 0,
            "wallets.bsc.privateKey": 0,
            "wallets.tron.privateKey": 0,
            password: 0,
            country: 0,
        }
    );
}

/**
 * GET /api/tarot/live-view — recent rows for RealView (TwistRealViewRow shape).
 */
export const getTarotLiveView = async (_req, res) => {
    try {
        const data = await fetchTarotLivePayload(TAROT_LIVE_API_LIMIT);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("[tarot] getTarotLiveView", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Second phase (like pumping `scheduleCreditAndBroadcast`): credit win + win totalhistory only.
 * Tarot row is already stored on debit so the client can show bet history immediately.
 */
async function settleTarotCredit(userAuthId, win) {
    try {
        const u = await User.findOne({ userAuthId });
        if (!u) return;

        u.balance = round2(Number(u.balance ?? 0) + win);
        if (win > 0) {
            u.totalEarn = round2(Number(u.totalEarn ?? 0) + win);
        }
        u.totalhistory = u.totalhistory || [];
        u.totalhistory.push({
            amount: win,
            date: new Date(),
            type: "tarot",
        });
        await u.save();
    } catch (err) {
        console.error("[tarot] settleTarotCredit", err);
    }
}

/**
 * POST /api/tarot/play { betAmount }
 * 1) Debit stake + record round on tarotHistory (outcome known server-side).
 * 2) After delay, credit win (balance + win) like pumping.
 */
export const playTarot = async (req, res) => {
    try {
        if (!req.user?.userAuthId) return res.status(401).json({ error: "Unauthorized" });

        const betAmount = round2(Number(req.body?.betAmount ?? 0));
        if (!Number.isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
            return res.status(400).json({
                error: "Invalid bet amount",
                message: `Bet must be between ${MIN_BET} and ${MAX_BET}`,
            });
        }

        const preUser = await User.findOne({ userAuthId: req.user.userAuthId }, { tarotRevenue: 1, tarotMode: 1, balance: 1 });
        if (!preUser) return res.status(404).json({ error: "User not found" });

        const tarotSettings = await getTarotSettingsMerged();
        const currentRevenue = Number(preUser.tarotRevenue ?? 0);
        const modeLevel = getTarotModeLevelByRevenue(currentRevenue, tarotSettings.revenueAutoMode);
        const modeKey = getTarotModeKeyByLevel(modeLevel);

        const round = await sampleTarotRound(modeKey);
        const { totalMult, base, left, right } = round;
        const win = round2(betAmount * totalMult);
        const roundNet = round2(win - betAmount);
        const nextRevenue = round2(currentRevenue + roundNet);
        const nextModeLevel = getTarotModeLevelByRevenue(nextRevenue, tarotSettings.revenueAutoMode);

        const historyEntry = {
            betAmount,
            totalMultiplier: totalMult,
            profit: win,
            busted: totalMult <= 0,
            base,
            left,
            right,
            createAt: new Date(),
        };

        const updateResult = await User.updateOne(
            { userAuthId: req.user.userAuthId, balance: { $gte: betAmount } },
            {
                $inc: {
                    balance: -betAmount,
                    totalBet: betAmount,
                    refreshBet: betAmount,
                    lotterybet: betAmount,
                    tarotTotalBetAmount: betAmount,
                    tarotTotalProfit: win,
                    tarotRevenue: roundNet,
                },
                $set: { tarotMode: nextModeLevel },
                $push: {
                    totalhistory: {
                        amount: round2(-betAmount),
                        date: new Date(),
                        type: "tarot",
                    },
                    tarotHistory: {
                        $each: [historyEntry],
                        $slice: -TAROT_HISTORY_MAX,
                    },
                },
            }
        );

        if (!updateResult.matchedCount) {
            const user = await loadUser(req);
            const balance = Number(user?.balance ?? 0);
            if (!user) return res.status(404).json({ error: "User not found" });
            if (balance < betAmount) {
                return res.status(400).json({ error: "Insufficient balance", message: "Insufficient balance" });
            }
            return res.status(409).json({ error: "Tarot bet conflict", message: "Try again" });
        }

        setTimeout(() => settleTarotCredit(req.user.userAuthId, win), TAROT_CREDIT_DELAY_MS);

        const user = await loadUser(req);
        if (!user) return res.status(404).json({ error: "User not found" });

        try {
            await TarotView.create({
                userName: user.altas ?? "",
                isWin: win > 0,
                betAmount: round2(Number(betAmount)),
                result: Number(totalMult).toFixed(2),
                winAmount: round2(Number(win)),
                date: new Date(),
            });
            await trimTarotViewsToMax();
        } catch (err) {
            console.error("[tarot] TarotView.create", err);
        }

        publishTarotViewFeed(req.app?.locals?.ably).catch((err) =>
            console.error("[tarot] publishTarotViewFeed", err)
        );

        return sendUserResponse(res, "", user, {
            tarot: {
                betAmount,
                win,
                totalMult,
                mode: modeKey,
                base,
                left,
                right,
                balanceDelta: -betAmount,
                creditDelayMs: TAROT_CREDIT_DELAY_MS,
            },
        });
    } catch (error) {
        console.error("[tarot] playTarot", error);
        return res.status(500).json({ error: error.message });
    }
};
