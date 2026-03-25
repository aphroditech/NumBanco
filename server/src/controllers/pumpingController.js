import User from "../models/User.js";
import Setting from "../models/Setting.js";
import PumpingView from "../models/PumpingView.js";
import PumpingLimit from "../models/PumpingLimit.js";
import PumpingMulti from "../models/PumpingMulti.js";
import { calculatePumping } from "../services/pumping/calculatePumping.js";

const VIEW_LIMIT = 12;
const CREDIT_DELAY_MS = 1000;
const ROUND_4 = (x) => Math.round(x * 10000) / 10000;
const ROUND_2 = (x) => Math.round(x * 100) / 100;
let pumpingSettingCache = null;
let pumpingMultiRangesCache = null;

function getConsecutiveWinsAfterLastLose(pumpingHistory) {
    const lastLoseIndex = pumpingHistory.map((item) => item.win).lastIndexOf(0);
    return pumpingHistory
        .slice(lastLoseIndex + 1)
        .filter((item) => item.target > 1 && item.win > 0);
}

async function computeWinProbability(target, consecutiveWinsCount) {
    const pumpingMulti = await getPumpingMultiByTarget(target);
    const base = consecutiveWinsCount > pumpingMulti?.min ? Math.floor(Math.random() * 2) : 0 || consecutiveWinsCount > pumpingMulti?.max && 1;
    return base || 0;
}

async function computeBetResult(body, user) {
    const filtered = getConsecutiveWinsAfterLastLose(user.pumpingHistory || []);
    const setting = await getPumpingSetting();
    const pumpingLimitTarget = setting.pumpingLimitTarget;
    const pumpingLimitAmount = setting.pumpingLimitAmount;
    const probability = await computeWinProbability(body.target, filtered.length);

    let result;
    if (probability || body.target > pumpingLimitTarget || body.amount * (body.target - 1) > pumpingLimitAmount) {
        console.log("lose");
        result = 1 + (body.target - 1.01) * Math.random();
        result = ROUND_2(result);
    } else {
        result = await calculatePumping(user.pumpingMode || 1);
    }

    const win = result >= body.target ? body.target * body.bet : 0;
    return { result, win };
}

function sessionTotals(prev, betAmount, winAmount) {
    const totalBet = ROUND_4((prev.totalBet || 0) + betAmount);
    const totalWin = ROUND_4((prev.totalWin || 0) + winAmount);
    const pumpingBalance = ROUND_4(totalWin - totalBet);
    return { totalBet, totalWin, pumpingBalance };
}

async function applyPumpingMode(user, totalBet, pumpingBalance) {
    const limit =
        (await PumpingLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && pumpingBalance > limit.limitHard) {
        user.pumpingMode = 2;
    } else if (limit.limitNormal != null && pumpingBalance < limit.limitNormal) {
        user.pumpingMode = 1;
    }
}

async function computePumpingMode(currentMode, totalBet, pumpingBalance) {
    const limit =
        (await PumpingLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        }).lean()) || {};
    if (limit.limitHard != null && pumpingBalance > limit.limitHard) {
        return 2;
    } else if (limit.limitNormal != null && pumpingBalance < limit.limitNormal) {
        return 1;
    }
    return currentMode;
}

async function getPumpingSetting() {
    if (pumpingSettingCache) return pumpingSettingCache;
    const setting = await Setting.findOne({}).lean();
    pumpingSettingCache = setting || {};
    return pumpingSettingCache;
}

async function getPumpingMultiByTarget(target) {
    if (!pumpingMultiRangesCache) {
        pumpingMultiRangesCache = await PumpingMulti.find({}).lean();
    }
    return (
        pumpingMultiRangesCache.find(
            (row) => Number(row?.from) <= Number(target) && Number(row?.to) >= Number(target)
        ) || null
    );
}

async function enrichPumpingViewsWithUser(pumpingViews) {
    if (!Array.isArray(pumpingViews) || pumpingViews.length === 0) return [];

    const userIds = [...new Set(pumpingViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();
    const userMap = new Map(users.map((u) => [u.userId, u]));

    return pumpingViews.map((item) => {
        const obj = { ...item };
        delete obj.isUser;
        delete obj.totalBet;
        delete obj.totalWin;
        delete obj.pumpingBalance;
        const user = userMap.get(item.userId);
        if (user) {
            return {
                ...obj,
                avatar: user.avatar,
                altas: user.altas,
                membership: user.membership,
            };
        }
        return obj;
    });
}

async function scheduleCreditAndBroadcast(userId, win, app) {
    const updatedUser = await User.findOne(
        { userId: userId },
        {
            "wallets.eth.privateKey": 0,
            "wallets.bsc.privateKey": 0,
            "wallets.tron.privateKey": 0,
            password: 0,
            country: 0,
            pumpingMode: 0,
            fishingMode: 0,
            rubicMode: 0,
            partnerId: 0,
            partnerActivity: 0,
            lastClickDate: 0,
            
        }
    );
    if (!updatedUser?.pumpingHistory) return;

    updatedUser.pumpingHistory.forEach((item) => {
        item.active = true;
    });
    updatedUser.balance += win;
    updatedUser.totalEarn = (1000 * updatedUser.totalEarn + 1000 * win) / 1000;
    updatedUser.totalhistory.push({
        amount: win,
        date: new Date(),
        type: "pumping",
    });
    await updatedUser.save();

    const ably = app?.locals?.ably;
    if (ably) {
        const views = await PumpingView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT).lean();
        const data = await enrichPumpingViewsWithUser(views);
        ably.channels.get("pumpingGame").publish("pumpingUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [pumpingController] Ably publish error:", err);
        });
    }
}

export const bet = async (req, res) => {
    const user = await User.findOne(
        { userAuthId: req.user.userAuthId },
        {
            userId: 1,
            userAuthId: 1,
            balance: 1,
            totalBet: 1,
            refreshBet: 1,
            lotterybet: 1,
            pumpingHistory: { $slice: -120 },
            pumpingMode: 1,
        }
    ).lean();
    const { target, bet: betAmountRaw } = req.body;
    const betAmount = Number(betAmountRaw) || 0;

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    if (betAmount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
    }
    if ((user.balance || 0) < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
    }

    const { result, win } = await computeBetResult(req.body, user);

    const lastHistory =
        user.pumpingHistory?.length > 0
            ? user.pumpingHistory[user.pumpingHistory.length - 1]
            : { totalBet: 0, totalWin: 0 };
    const prevTotals = lastHistory;
    const totals = sessionTotals(prevTotals, betAmount, win);
    const nextMode = await computePumpingMode(user.pumpingMode, totals.totalBet, totals.pumpingBalance);

    const betEntry = {
        target,
        bet: betAmount,
        result,
        win,
        totalBet: totals.totalBet,
        totalWin: totals.totalWin,
        pumpingBalance: totals.pumpingBalance,
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
            },
            $push: {
                totalhistory: {
                    amount: -betAmount,
                    date: new Date(),
                    type: "pumping",
                },
                pumpingHistory: betEntry,
            },
            ...(nextMode !== user.pumpingMode ? { $set: { pumpingMode: nextMode } } : {}),
        }
    );
    if (!updateResult?.matchedCount) {
        return res.status(409).json({ message: "Pumping bet conflict" });
    }

    setTimeout(
        () => scheduleCreditAndBroadcast(req.user.userId, win, req.app),
        CREDIT_DELAY_MS
    );

    Promise.resolve()
        .then(async () => {
            const lastView = (await PumpingView.find().sort({ createdAt: -1 }).limit(1).lean())[0];
            const viewTotals = sessionTotals(
                {
                    totalBet: lastView?.totalBet ?? 0,
                    totalWin: lastView?.totalWin ?? 0,
                },
                betAmount,
                win
            );
            const pumpingView = new PumpingView({
                userId: req.user.userId,
                target,
                bet: betAmount,
                result,
                win,
                totalBet: viewTotals.totalBet,
                totalWin: viewTotals.totalWin,
                pumpingBalance: viewTotals.pumpingBalance,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
            });
            await pumpingView.save();
        })
        .catch((err) => {
            console.error("pumping bet view-write error:", err);
        });

    // Keep payload minimal for low-latency round-trip.
    return res.json({
        balanceDelta: -betAmount,
        betResult: result,
        target,
        win,
    });
};

export const getPumpingView = async (req, res) => {
    try {
        const views = await PumpingView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT).lean();
        const data = await enrichPumpingViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};