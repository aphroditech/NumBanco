import User from "../models/User.js";
import FishingView from "../models/FishingView.js";
import FishingPercentage from "../models/FishingPercentage.js";
import FishingLimit from "../models/FishingLimit.js";
import { sendUserResponse } from "../utils/responses.js";

// Prevent concurrent `pullStay` updates for the same user.
// VersionError happens when two requests update the same user doc at nearly the same time.
const fishingPullStayLocks = new Map();

const fishingUserProjection = {
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
    canWithdraw: 0,
};

const getFishingUser = async (userId) => {
    return User.findOne({ userId }, fishingUserProjection);
};

const getActiveFishingHistoryItem = (user) => {
    return user.fishingHistory?.find((item) => item.active === false) ?? null;
};

const addToThousand = (current, delta) => {
    return (
        (Number(1000 * toNumberOrZero(current)) + Number(1000 * toNumberOrZero(delta))) /
        1000
    );
};

const getLastFishingView = async () => {
    const last = await FishingView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createFishingViewEntry = async ({
    userId,
    bet,
    win,
    step,
    multi,
    status,
}) => {
    const last = await getLastFishingView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const fishingBalance = totalWin - totalBet;

    const fishingView = new FishingView({
        userId,
        bet: numBet,
        win: numWin,
        step: toNumberOrZero(step),
        multi: toNumberOrZero(multi),
        totalBet,
        totalWin,
        fishingBalance,
        isUser: 1,
        status,
        time: new Date(),
    });

    await fishingView.save();
    return fishingView;
};

export const bet = async (req, res) => {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid fishing bet amount" });
    }

    const user = await getFishingUser(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.balance -= amount;

    user.totalBet = addToThousand(user.totalBet, amount);
    user.refreshBet = addToThousand(user.refreshBet, amount);
    user.lotterybet = addToThousand(user.lotterybet, amount);

    const pending = user.fishingHistory?.filter((item) => item.active === false) ?? [];
    if (pending.length > 0) {
        return res.status(409).json({ error: "Fishing bet already in progress" });
    }

    const lastHistory =
        user.fishingHistory?.length > 0
            ? user.fishingHistory[user.fishingHistory.length - 1]
            : { totalBet: 0, totalWin: 0, fishingBalance: 0 };
        
    user.totalhistory.push({
        amount: -amount,
        date: new Date(),
        type: "fishing",
    });

    const betEntry = {
        bet: amount,
        win: 0,
        step: 0,
        multi: 1,
        totalBet: toNumberOrZero(lastHistory.totalBet) + amount,
        totalWin: toNumberOrZero(lastHistory.totalWin),
        fishingBalance: toNumberOrZero(lastHistory.fishingBalance),
        createAt: new Date(),
    };

    user.fishingHistory.push(betEntry);
    // Avoid Mongoose optimistic concurrency failures (VersionError) on fast repeated requests.
    await user.save({ optimisticConcurrency: false });

    return sendUserResponse(res, "", user);
};
export const pullStay = async (req, res) => {
    try {
        const { userId } = req.user;
        const { act } = req.body;

        if (fishingPullStayLocks.get(userId) === true) {
            return res.status(409).json({ error: "Fishing action is already in progress" });
        }
        fishingPullStayLocks.set(userId, true);

        // if act is 1, then stay
        // if act is -1, then pull

        const user = await getFishingUser(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const historyItem = getActiveFishingHistoryItem(user);
        if (!historyItem) {
            return res.status(400).json({ error: "No active fishing bet to pull" });
        }

        const actNum = Number(act);
        if (!Number.isFinite(actNum) || (actNum !== -1 && actNum !== 1)) {
            return res.status(400).json({ error: "Invalid pull action" });
        }

        const nextStep = historyItem.step + 1;
        const distance = generateDistance(nextStep);
        const operator = await generateOperator(nextStep, user.fishingMode, actNum);

        const strength = calculateStrength(distance, operator);
        const flag = calculateFlag(actNum, operator);
        updateHistory(historyItem, nextStep, distance, flag, strength, actNum);

        let status = "continue";

        if (historyItem.multi < 0) {
            status = "bang";
            bangFishing(historyItem);

            historyItem.fishingBalance = historyItem.totalWin - historyItem.totalBet;

            await createFishingViewEntry({
                userId: user.userId,
                bet: historyItem.bet,
                win: historyItem.win,
                step: historyItem.step,
                multi: historyItem.multi,
                status: "bang",
            });
            applyFishingMode(user, historyItem.totalBet, historyItem.totalWin - historyItem.totalBet);
        scheduleCreditAndBroadcast(req.app);
        } else if (nextStep === 10 && historyItem.multi > 0) {
            status = "win";

            const winAmount = historyItem.bet * historyItem.multi;
            winFishing(historyItem);

            const lastHistory =
                user.fishingHistory?.[user.fishingHistory.length - 1] ?? {
                    totalBet: 0,
                    totalWin: 0,
                    fishingBalance: 0,
                };

            historyItem.win = winAmount;
            historyItem.totalWin =
                toNumberOrZero(lastHistory.totalWin) + toNumberOrZero(winAmount);
            historyItem.fishingBalance = historyItem.totalWin - historyItem.totalBet;

            await createFishingViewEntry({
                userId: user.userId,
                bet: historyItem.bet,
                win: winAmount,
                step: historyItem.step,
                multi: historyItem.multi,
                status: "win",
            });
            applyFishingMode(user, historyItem.totalBet, historyItem.totalWin - historyItem.totalBet);
            scheduleCreditAndBroadcast(req.app);
        }

        // Avoid Mongoose optimistic concurrency failures (VersionError) on fast repeated requests.
        await user.save({ optimisticConcurrency: false });
        return sendUserResponse(res, "", user, { strength, status });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    } finally {
        const { userId } = req.user || {};
        if (userId) fishingPullStayLocks.delete(userId);
    }
};

export const fishingCashOut = async (req, res) => {
    try {
        const user = await getFishingUser(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const historyItem = getActiveFishingHistoryItem(user);
        if (!historyItem) {
            return res.status(400).json({ error: "No active fishing bet to cash out" });
        }

        const lastHistory =
            user.fishingHistory?.length > 1
                ? user.fishingHistory[user.fishingHistory.length - 2]
                : { totalBet: 0, totalWin: 0, fishingBalance: 0 };

        const numAmount = toNumberOrZero(historyItem.bet);
        const numMulti = toNumberOrZero(historyItem.multi);
        const winAmount = numAmount * numMulti;

        historyItem.active = true;
        historyItem.win = winAmount;
        historyItem.totalBet = toNumberOrZero(lastHistory.totalBet) + numAmount;
        historyItem.totalWin = toNumberOrZero(lastHistory.totalWin) + winAmount;
        historyItem.fishingBalance = historyItem.totalWin - historyItem.totalBet;

        user.balance += winAmount;

        applyFishingMode(user, historyItem.totalBet, historyItem.totalWin - historyItem.totalBet);

        // Avoid Mongoose optimistic concurrency failures (VersionError) on fast repeated requests.
        await user.save({ optimisticConcurrency: false });

        await createFishingViewEntry({
            userId: user.userId,
            bet: numAmount,
            win: winAmount,
            step: historyItem.step,
            multi: numMulti,
            status: "cashout",
        });

        scheduleCreditAndBroadcast(req.app);

        return sendUserResponse(res, "", user);
    } catch (error) {
        console.error("fishingCashOut error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getFishingView = async (req, res) => {
    try {
        const views = await FishingView.find().sort({ createdAt: -1 }).limit(12);
        const data = await enrichFishingViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const generateDistance = (step) => {
    return Math.floor(Math.random() * 5) + 1 + (step - 1) * 5;
};

const generateOperator = async (step, mode, actNum) => {
    const fishingPercentage = await FishingPercentage.findOne({ step });
    const percentages = Number(mode) === 0 ? fishingPercentage.easy : Number(mode) === 1 ? fishingPercentage.normal : fishingPercentage.hard;
    
    return Math.random() < percentages / 100 ? actNum : -actNum;
};

const calculateStrength = (distance, operator) => {
    return 50 + operator * distance;
};

const calculateFlag = (act, operator) => {
    return act === operator ? 1 : -1;
};

const updateHistory = (historyItem, step, distance, flag, strength, act) => {
    console.log("flag", Number(flag), "act", Number(act));
    historyItem.step++;

    const delta = (distance / 5) * flag;
    historyItem.multi = roundToThree(historyItem.multi + delta);

    historyItem.info.push({
        step,
        strength,
        act,
        status: flag,
        multi: historyItem.multi,
    });
};

const roundToThree = (num) => {
    return Math.round(num * 1000) / 1000;
};

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const bangFishing = (historyItem) => {
    historyItem.active = true;
};

const winFishing = (historyItem) => {
    historyItem.active = true;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await FishingView.find().sort({ createdAt: -1 }).limit(12);
        const data = await enrichFishingViewsWithUser(views);
        ably.channels.get("fishingGame").publish("fishingUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [fishingController] Ably publish error:", err);
        });
    }
}


async function enrichFishingViewsWithUser(fishingViews) {
    return Promise.all(
        fishingViews.map(async (item) => {
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
                    canWithdraw: 0,
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

async function applyFishingMode(user, totalBet, fishingBalance) {
    const limit =
        (await FishingLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && fishingBalance > limit.limitHard) {
        user.fishingMode = 2;
    } else if (limit.limitNormal != null && fishingBalance < limit.limitNormal) {
        user.fishingMode = 1;
    }
}