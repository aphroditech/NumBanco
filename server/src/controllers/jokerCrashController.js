import User from "../models/User.js";
import JokerCrashView from "../models/JokerCrashView.js";
import { sendUserResponse } from "../utils/responses.js";
import JokerCrashLimit from "../models/JokerCrashLimit.js";
import JokerCrashCard from "../models/JokerCrashCard.js";
import JokerCrashPercentage from "../models/JokerCrashPercentage.js";
import JokerCrashIncrease from "../models/JokerCrashIncrease.js";

// Prevent concurrent `pullStay` updates for the same user.
// VersionError happens when two requests update the same user doc at nearly the same time.
const jokerCrashPullStayLocks = new Map();

const jokerCrashUserProjection = {
    "wallets.eth.privateKey": 0,
    "wallets.bsc.privateKey": 0,
    "wallets.tron.privateKey": 0,
    password: 0,
    country: 0,
    pumpingMode: 0,
    fishingMode: 0,
    jokerCrashMode: 0,
    rubicMode: 0,
    partnerId: 0,
    partnerActivity: 0,
    lastClickDate: 0,
    canWithdraw: 0,
};

const getJokerCrashUser = async (userId) => {
    return User.findOne({ userId }, jokerCrashUserProjection);
};

const getActiveJokerCrashHistoryItem = (user) => {
    return user.jokerCrashHistory?.find((item) => item.active === false) ?? null;
};

const addToThousand = (current, delta) => {
    return (
        (Number(1000 * toNumberOrZero(current)) + Number(1000 * toNumberOrZero(delta))) /
        1000
    );
};

const getLastJokerCrashView = async () => {
    const last = await JokerCrashView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createJokerCrashViewEntry = async ({
    userId,
    bet,
    win,
    step,
    multi,
    status,
}) => {
    const last = await getLastJokerCrashView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const jokerCrashBalance = totalWin - totalBet;

    const jokerCrashView = new JokerCrashView({
        userId,
        bet: numBet,
        win: numWin,
        step: toNumberOrZero(step),
        multi: toNumberOrZero(multi),
        totalBet,
        totalWin,
        jokerCrashBalance,
        isUser: 1,
        status,
        time: new Date(),
    });

    await jokerCrashView.save();
    return jokerCrashView;
};

export const bet = async (req, res) => {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid jokerCrash bet amount" });
    }

    const user = await getJokerCrashUser(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if(amount > user.balance) {
        return sendUserResponse(res, "You don't have enough balance to bet", user, {status: "error"});
    }

    user.balance -= amount;

    user.totalBet = addToThousand(user.totalBet, amount);
    user.refreshBet = addToThousand(user.refreshBet, amount);
    user.lotterybet = addToThousand(user.lotterybet, amount);

    const pending = user.jokerCrashHistory?.filter((item) => item.active === false) ?? [];
    if (pending.length > 0) {
        return res.status(409).json({ error: "JokerCrash bet already in progress" });
    }

    const lastHistory =
        user.jokerCrashHistory?.length > 0
            ? user.jokerCrashHistory[user.jokerCrashHistory.length - 1]
            : { totalBet: 0, totalWin: 0, jokerCrashBalance: 0 };
        
    user.totalhistory.push({
        amount: -amount,
        date: new Date(),
        type: "jokerCrash",
    });

    const betEntry = {
        bet: amount,
        win: 0,
        step: 0,
        multi: 1,
        totalBet: toNumberOrZero(lastHistory.totalBet) + amount,
        totalWin: toNumberOrZero(lastHistory.totalWin),
        jokerCrashBalance: toNumberOrZero(lastHistory.jokerCrashBalance),
        info: [{
            operator: ' ',
            step: 1,
            card: 1,
            multi: 1,
            status: 1,
        }],
        createAt: new Date(),
    };

    user.jokerCrashHistory.push(betEntry);
    await user.save({ optimisticConcurrency: false });
    return sendUserResponse(res, "", user, {status: "success"});
};

export const operator = async (req, res) => {
    try {
        const { userId } = req.user;
        const { operator } = req.body;

        const user = await getJokerCrashUser(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const historyItem = getActiveJokerCrashHistoryItem(user);
        if (!historyItem) {
            return res.status(400).json({ error: "No active jokerCrash bet to pull" });
        }

        const lastInfo = historyItem.info?.length ? historyItem.info[historyItem.info.length - 1] : null;

        const nextStep = historyItem.step + 1;
        const card = await calculateJokerCrashCard(req.user.jokerCrashMode, lastInfo.card, operator);

        const {multi, status, imulti} = await calculateJokerCrashMulti(operator, card, lastInfo, req.user.jokerCrashMode);

        historyItem.multi = multi;

        updateHistory(historyItem, nextStep, card, multi, status, operator, imulti);

        var bang = 1;
        if (multi <= 0) {
            bang = -1;
            bangJokerCrash(historyItem);

            historyItem.jokerCrashBalance = historyItem.totalWin - historyItem.totalBet;

            await createJokerCrashViewEntry({
                userId: user.userId,
                bet: historyItem.bet,
                win: historyItem.win,
                step: historyItem.step,
                multi: historyItem.multi,
                status: "bang",
            });
            
            applyJokerCrashMode(user, historyItem.totalBet, historyItem.jokerCrashBalance);
            scheduleCreditAndBroadcast(req.app);
        }

        const data = {
            card: card,
            multi: multi,
            imulti: imulti,
            bang: bang,
        }
        await user.save({ optimisticConcurrency: false });
        return sendUserResponse(res, "", user, {data});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    } finally {
        const { userId } = req.user || {};
        if (userId) jokerCrashPullStayLocks.delete(userId);
    }
};

export const jokerCrashCashOut = async (req, res) => {
    try {
        const user = await getJokerCrashUser(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const historyItem = getActiveJokerCrashHistoryItem(user);
        if (!historyItem) {
            return res.status(400).json({ error: "No active jokerCrash bet to cash out" });
        }

        const lastHistory =
            user.jokerCrashHistory?.length > 1
                ? user.jokerCrashHistory[user.jokerCrashHistory.length - 2]
                : { totalBet: 0, totalWin: 0, jokerCrashBalance: 0 };

        const numAmount = toNumberOrZero(historyItem.bet);
        const numMulti = toNumberOrZero(historyItem.multi);
        const winAmount = numAmount * numMulti;

        historyItem.active = true;
        historyItem.win = winAmount;
        historyItem.totalBet = toNumberOrZero(lastHistory.totalBet) + numAmount;
        historyItem.totalWin = toNumberOrZero(lastHistory.totalWin) + winAmount;
        historyItem.jokerCrashBalance = historyItem.totalWin - historyItem.totalBet;

        user.balance += winAmount;

        applyJokerCrashMode(user, historyItem.totalBet, historyItem.jokerCrashBalance);

        await user.save({ optimisticConcurrency: false });

        await createJokerCrashViewEntry({
            userId: user.userId,
            bet: numAmount,
            win: winAmount,
            step: historyItem.step,
            multi: numMulti,
            status: "cashout",
        });

        const data = {
            win: winAmount,
        }

        scheduleCreditAndBroadcast(req.app);

        return sendUserResponse(res, "", user, {data});
    } catch (error) {
        console.error("jokerCrashCashOut error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getJokerCrashView = async (req, res) => {
    try {
        const views = await JokerCrashView.find().sort({ createdAt: -1 }).limit(12);
        const data = await enrichJokerCrashViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const updateHistory = (historyItem, step, card, multi, status, operator, imulti) => {
    historyItem.step++;

    historyItem.info.push({
        step,
        card,
        multi,
        status,
        operator,
        imulti,
    });
};

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const bangJokerCrash = (historyItem) => {
    historyItem.active = true;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await JokerCrashView.find().sort({ createdAt: -1 }).limit(12);
        const data = await enrichJokerCrashViewsWithUser(views);
        ably.channels.get("jokerCrashGame").publish("jokerCrashUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [jokerCrashController] Ably publish error:", err);
        });
    }
}

async function enrichJokerCrashViewsWithUser(jokerCrashViews) {
    return Promise.all(
        jokerCrashViews.map(async (item) => {
            const user = await User.findOne(
                { userId: item.userId },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    country: 0,
                    pumpingMode: 0,
                    fishingMode: 0,
                    jokerCrashMode: 0,
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

async function applyJokerCrashMode(user, totalBet, jokerCrashBalance) {
    const limit =
        (await JokerCrashLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && jokerCrashBalance > limit.limitHard) {
        user.jokerCrashMode = 2;
    } else if (limit.limitNormal != null && jokerCrashBalance < limit.limitNormal) {
        user.jokerCrashMode = 1;
    }
}

const calculateJokerCrashMulti = async (operator, card, lastInfo, mode) => {
    const prevCard = Number(lastInfo?.card ?? 1);
    const prevMulti = Number(lastInfo?.multi ?? 1);

    const increase = Math.abs(card - prevCard );

    const cardData = await JokerCrashCard.findOne({ card: prevCard });
    const increaseData = await JokerCrashIncrease.findOne({ increase: increase });
    let isWin = false;
    if (operator === '=') {
        isWin = card === prevCard;
    } else if (operator === '<') {
        isWin = card < prevCard;
    } else if (operator === '>') {
        isWin = card > prevCard;
    } else {
        isWin = false;
    }

    var multi = prevMulti;
    var imulti = 1;

    if(isWin) {
        var cardMulti = 1;
        var increaseMulti = 1;

        if(Number(mode) === 0) increaseMulti = increaseData.easy;
        if(Number(mode) === 1) increaseMulti = increaseData.normal;
        if(Number(mode) === 2) increaseMulti = increaseData.hard;

        if(operator === '=') cardMulti = cardData.equal;
        if(operator === '<') cardMulti = cardData.lesser;
        if(operator === '>') cardMulti = cardData.greater;

        imulti = increaseMulti * cardMulti;
        multi += increaseMulti * cardMulti;
    } else {
        multi -= 1;
        imulti = -1;
    }

    const status = isWin ? 1 : -1;

    return { multi, status, imulti };
}

const calculateJokerCrashCard = async (mode, lastCard, operator) => {
    const jokerCrashPercentage = await JokerCrashPercentage.findOne({card: lastCard});

    var percentages = 0;
    if(operator === '=') {
        percentages = jokerCrashPercentage.equal;
    } else if(operator === '<') {
        percentages = jokerCrashPercentage.lesser;
    } else if(operator === '>') {
        percentages = jokerCrashPercentage.greater;
    }
    
    const random = Math.floor(Math.random() * 100) + 1;
    if(random <= percentages) {
        if(operator === '=') {
            return lastCard;
        } else if(operator === '<') {
            return Math.floor(Math.random() * (lastCard - 1)) + 1;
        } else if(operator === '>') {
            return Math.floor(Math.random() * (13 - lastCard)) + lastCard + 1;
        }
    } else {
        if(operator === '=') {
            const rand = Math.floor(Math.random() * 12) + 1;
            return rand >= lastCard ? rand + 1 : rand;
        } else if(operator === '<') {
            return Math.floor(Math.random() * (13 - lastCard)) + lastCard + 1;
        } else if(operator === '>') {
            return Math.floor(Math.random() * (lastCard - 1)) + 1;
        }
    }
}