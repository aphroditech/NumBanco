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

function getConsecutiveWinsAfterLastLose(pumpingHistory) {
    const lastLoseIndex = pumpingHistory.map((item) => item.win).lastIndexOf(0);
    return pumpingHistory
        .slice(lastLoseIndex + 1)
        .filter((item) => item.target > 1 && item.win > 0);
}

async function computeWinProbability(target, consecutiveWinsCount) {
    const pumpingMulti = await PumpingMulti.findOne({
        from: { $lte: target },
        to: { $gte: target },
    });
    const base = consecutiveWinsCount > pumpingMulti?.min ? Math.floor(Math.random() * 2) : 0 || consecutiveWinsCount > pumpingMulti?.max && 1;
    return base || 0;
}

async function computeBetResult(body, user) {
    const filtered = getConsecutiveWinsAfterLastLose(user.pumpingHistory || []);
    const setting = await Setting.findOne({});
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

async function enrichPumpingViewsWithUser(pumpingViews) {
    return Promise.all(
        pumpingViews.map(async (item) => {
            const user = await User.findOne(
                { userId: item.userId },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    country: 0,
                    pumpingMode: 0,
                    fishingMode: 0,
                    rubicMode: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    
                });
            const obj = item.toObject();
            delete obj.isUser;
            delete obj.totalBet;
            delete obj.totalWin;
            delete obj.pumpingBalance;
            if (user) {
                return {
                    ...obj,
                    avatar: user.avatar,
                    altas: user.altas,
                    membership: user.membership,
                };
            }
            return obj;
        })
    );
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
        const views = await PumpingView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichPumpingViewsWithUser(views);
        ably.channels.get("pumpingGame").publish("pumpingUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [pumpingController] Ably publish error:", err);
        });
    }
}

export const bet = async (req, res) => {
    const user = await User.findOne({ userAuthId: req.user.userAuthId }).select(
        "userId userAuthId balance totalBet refreshBet lotterybet totalhistory pumpingHistory pumpingMode"
    );
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

    user.balance -= betAmount;
    user.totalBet = (1000 * user.totalBet + 1000 * betAmount) / 1000;
    user.refreshBet = (1000 * user.refreshBet + 1000 * betAmount) / 1000;
    user.lotterybet = (1000 * user.lotterybet + 1000 * betAmount) / 1000;
    user.totalhistory.push({
        amount: -betAmount,
        date: new Date(),
        type: "pumping",
    });

    const lastHistory =
        user.pumpingHistory?.length > 0
            ? user.pumpingHistory[user.pumpingHistory.length - 1]
            : { totalBet: 0, totalWin: 0 };
    const lastView = (await PumpingView.find().sort({ createdAt: -1 }).limit(1))[0];
    const prevTotals = lastHistory;
    const totals = sessionTotals(prevTotals, betAmount, win);

    await applyPumpingMode(user, totals.totalBet, totals.pumpingBalance);

    const viewTotals = sessionTotals(
        {
            totalBet: lastView?.totalBet ?? 0,
            totalWin: lastView?.totalWin ?? 0,
        },
        betAmount,
        win
    );

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

    user.pumpingHistory.push(betEntry);
    await user.save();

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

    setTimeout(
        () => scheduleCreditAndBroadcast(req.user.userId, win, req.app),
        CREDIT_DELAY_MS
    );

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
        const views = await PumpingView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichPumpingViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};