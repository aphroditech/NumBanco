import User from "../models/User.js";
import DiamondView from "../models/diamond/DiamondView.js";
import { sendUserResponse } from "../utils/responses.js";
import { diamondKeysForRateIndex } from "../services/diamond/diamondGame.service.js";
import {
    sampleDiamondPayoutFromDb,
    getDiamondSettingsForClient,
    isDiamondMode,
    getResolvedRevenueAutoMode,
    getDiamondModeLevelByRevenue,
    DIAMOND_MODE_BY_LEVEL,
} from "../services/diamond/diamondSettings.service.js";
import {
    fetchDiamondLivePayload,
    DIAMOND_LIVE_API_LIMIT,
    publishDiamondViewFeed,
    trimDiamondViewsToMax,
} from "../services/diamond/diamondViewFeed.js";

const MIN_BET = 0.1;
const MAX_BET = 20;
const DIAMOND_HISTORY_MAX = 200;

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

function deriveDiamondTotalsFromHistory(history) {
    const list = Array.isArray(history) ? history : [];
    let totalBetAmount = 0;
    let totalProfit = 0;
    for (const row of list) {
        totalBetAmount += Number(row?.betAmount ?? 0);
        totalProfit += Number(row?.profit ?? 0);
    }
    return { totalBetAmount: round2(totalBetAmount), totalProfit: round2(totalProfit) };
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
 * GET /api/diamond/settings — paytable tiers (rate + normalized chance). Public.
 */
export const getDiamondSettings = async (_req, res) => {
    try {
        const payload = await getDiamondSettingsForClient();
        return res.status(200).json(payload);
    } catch (error) {
        console.error("[diamond] getDiamondSettings", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/diamond/live-view — recent calendar rows for RealView (TwistRealViewRow shape).
 */
export const getDiamondLiveView = async (_req, res) => {
    try {
        const data = await fetchDiamondLivePayload(DIAMOND_LIVE_API_LIMIT);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("[diamond] getDiamondLiveView", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/diamond/play { betAmount }
 * Authoritative outcome: weighted rate tier → win; five gem keys match that tier on the board.
 */
export const playDiamond = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const betAmount = round2(Number(req.body?.betAmount ?? 0));
        if (!Number.isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
            return res.status(400).json({
                error: "Invalid bet amount",
                message: `Bet must be between ${MIN_BET} and ${MAX_BET}`,
            });
        }

        const user = await loadUser(req);
        if (!user) return res.status(404).json({ error: "User not found" });

        const balance = Number(user.balance ?? 0);
        if (balance < betAmount) {
            return res.status(400).json({ error: "Insufficient balance", message: "Insufficient balance" });
        }

        const revenueBands = await getResolvedRevenueAutoMode();

        const hasPersistedTotals =
            Number.isFinite(Number(user.diamondTotalBetAmount)) &&
            Number.isFinite(Number(user.diamondTotalProfit));
        const baseTotals = hasPersistedTotals
            ? {
                  totalBetAmount: round2(Number(user.diamondTotalBetAmount)),
                  totalProfit: round2(Number(user.diamondTotalProfit)),
              }
            : deriveDiamondTotalsFromHistory(user.diamondHistory);
        const revenue = round2(baseTotals.totalProfit - baseTotals.totalBetAmount);
        const modeLevel = getDiamondModeLevelByRevenue(revenue, revenueBands);
        const mode = DIAMOND_MODE_BY_LEVEL[modeLevel] || "normal";
        if (!isDiamondMode(mode)) {
            return res.status(500).json({ error: "Invalid resolved diamond mode" });
        }

        const { mult, tier, rateIndex } = await sampleDiamondPayoutFromDb(mode);
        const keys = diamondKeysForRateIndex(rateIndex);
        const win = round2(betAmount * mult);

        user.balance = round2(balance - betAmount + win);
        user.totalBet = Number(user.totalBet ?? 0) + betAmount;
        user.refreshBet = Number(user.refreshBet ?? 0) + betAmount;
        user.lotterybet = Number(user.lotterybet ?? 0) + betAmount;
        user.diamondTotalBetAmount = round2(baseTotals.totalBetAmount + betAmount);
        user.diamondTotalProfit = round2(baseTotals.totalProfit + win);
        user.diamondRevenue = round2(user.diamondTotalProfit - user.diamondTotalBetAmount);
        user.diamondMode = getDiamondModeLevelByRevenue(user.diamondRevenue, revenueBands);
        user.totalhistory = user.totalhistory || [];
        user.totalhistory.push({
            amount: round2(win - betAmount),
            date: new Date(),
            type: "diamond",
        });

        user.diamondHistory = user.diamondHistory || [];
        user.diamondHistory.push({
            betAmount,
            totalMultiplier: mult,
            profit: win,
            busted: mult === 0,
            keys,
            tier,
            rateIndex,
            mode,
            createAt: new Date(),
        });
        if (user.diamondHistory.length > DIAMOND_HISTORY_MAX) {
            user.diamondHistory = user.diamondHistory.slice(-DIAMOND_HISTORY_MAX);
        }

        await user.save();

        try {
            await DiamondView.create({
                userName: user.altas ?? "",
                isWin: mult > 0,
                betAmount: round2(Number(betAmount)),
                level: Number(mult).toFixed(2),
                winAmount: round2(Number(win)),
                date: new Date(),
            });
            await trimDiamondViewsToMax();
        } catch (err) {
            console.error("[diamond] DiamondView.create", err);
        }

        publishDiamondViewFeed(req.app?.locals?.ably).catch((err) =>
            console.error("[diamond] publishDiamondViewFeed", err)
        );

        return sendUserResponse(res, "", user, {
            diamond: {
                keys,
                mult,
                tier,
                rateIndex,
                win,
                betAmount,
                mode,
                modeLevel: user.diamondMode,
                revenue: user.diamondRevenue,
                revenueAutoMode: revenueBands,
            },
        });
    } catch (error) {
        console.error("[diamond] playDiamond", error);
        return res.status(500).json({ error: error.message });
    }
};
