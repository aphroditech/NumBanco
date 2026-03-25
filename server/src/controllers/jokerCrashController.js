import User from "../models/User.js";
import JokerCrashView from "../models/JokerCrashView.js";
import JokerCrashLimit from "../models/JokerCrashLimit.js";
import JokerCrashCard from "../models/JokerCrashCard.js";
import JokerCrashPercentage from "../models/JokerCrashPercentage.js";
import JokerCrashIncrease from "../models/JokerCrashIncrease.js";

// Prevent concurrent `pullStay` updates for the same user.
// VersionError happens when two requests update the same user doc at nearly the same time.
const jokerCrashPullStayLocks = new Map();
const jokerCrashPercentageCache = new Map();
const jokerCrashCardCache = new Map();
const jokerCrashIncreaseCache = new Map();

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

const trimRecent = (arr, max = 30) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length <= max) return arr;
    return arr.slice(-max);
};

const compactJokerCrashHistoryForResponse = (history, { maxRounds = 8, maxInfo = 8 } = {}) => {
    if (!Array.isArray(history)) return [];
    return history.slice(-maxRounds).map((item) => ({
        ...item,
        info: trimRecent(item?.info, maxInfo),
    }));
};

const buildJokerCrashCompactUser = (user) => {
    const raw = typeof user?.toObject === "function" ? user.toObject() : user;
    if (!raw || typeof raw !== "object") return raw;

    const jokerCrashHistory = Array.isArray(raw.jokerCrashHistory)
        ? raw.jokerCrashHistory
              .map((item) => {
                  if (item?.active === false) return item;
                  return {
                      ...item,
                      info: trimRecent(item?.info, 15),
                  };
              })
              .slice(-20)
        : [];

    return {
        userId: raw.userId,
        balance: raw.balance,
        totalBet: raw.totalBet,
        refreshBet: raw.refreshBet,
        lotterybet: raw.lotterybet,
        jokerCrashMode: raw.jokerCrashMode,
        avatar: raw.avatar,
        altas: raw.altas,
        membership: raw.membership,
        notification: trimRecent(raw.notification, 20),
        jokerCrashHistory: compactJokerCrashHistoryForResponse(jokerCrashHistory),
    };
};

const sendJokerCrashUserResponse = (res, message, user, extra = {}) => {
    return res.json({
        message,
        ...extra,
        user: buildJokerCrashCompactUser(user),
    });
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

    const userId = req.user.userId;
    const snapshot = await User.findOne(
        { userId },
        {
            userId: 1,
            balance: 1,
            totalBet: 1,
            refreshBet: 1,
            lotterybet: 1,
            jokerCrashMode: 1,
            avatar: 1,
            altas: 1,
            membership: 1,
            notification: { $slice: -20 },
            jokerCrashHistory: { $slice: -20 },
        }
    ).lean();
    if (!snapshot) return res.status(404).json({ error: "User not found" });

    if (amount > toNumberOrZero(snapshot.balance)) {
        return res.json({
            message: "You don't have enough balance to bet",
            status: "error",
            user: {
                userId: snapshot.userId,
                balance: snapshot.balance,
                totalBet: snapshot.totalBet,
                refreshBet: snapshot.refreshBet,
                lotterybet: snapshot.lotterybet,
                jokerCrashMode: snapshot.jokerCrashMode,
                avatar: snapshot.avatar,
                altas: snapshot.altas,
                membership: snapshot.membership,
                notification: snapshot.notification ?? [],
                jokerCrashHistory: snapshot.jokerCrashHistory ?? [],
            },
        });
    }

    const lastHistory =
        Array.isArray(snapshot.jokerCrashHistory) && snapshot.jokerCrashHistory.length > 0
            ? snapshot.jokerCrashHistory[0]
            : { totalBet: 0, totalWin: 0, jokerCrashBalance: 0 };
    const now = new Date();
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
        createAt: now,
    };

    const updateResult = await User.updateOne(
        {
            userId,
            balance: { $gte: amount },
            "jokerCrashHistory.active": { $ne: false },
        },
        {
            $inc: {
                balance: -amount,
                totalBet: amount,
                refreshBet: amount,
                lotterybet: amount,
            },
            $push: {
                totalhistory: {
                    amount: -amount,
                    date: now,
                    type: "jokerCrash",
                },
                jokerCrashHistory: betEntry,
            },
        }
    );

    if (!updateResult?.matchedCount) {
        return res.status(409).json({ error: "JokerCrash bet already in progress" });
    }

    const updatedUser = {
        userId: snapshot.userId,
        balance: toNumberOrZero(snapshot.balance) - amount,
        totalBet: addToThousand(snapshot.totalBet, amount),
        refreshBet: addToThousand(snapshot.refreshBet, amount),
        lotterybet: addToThousand(snapshot.lotterybet, amount),
        jokerCrashMode: snapshot.jokerCrashMode,
        avatar: snapshot.avatar,
        altas: snapshot.altas,
        membership: snapshot.membership,
        notification: snapshot.notification ?? [],
        jokerCrashHistory: [...(snapshot.jokerCrashHistory ?? []), betEntry].slice(-20),
    };

    return res.json({
        message: "",
        status: "success",
        user: updatedUser,
    });
};

export const operator = async (req, res) => {
    try {
        const { userId } = req.user;
        const { operator } = req.body;

        const snapshot = await User.findOne(
            { userId, "jokerCrashHistory.active": false },
            {
                userId: 1,
                balance: 1,
                totalBet: 1,
                refreshBet: 1,
                lotterybet: 1,
                jokerCrashMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                jokerCrashHistory: { $slice: -20 },
            }
        ).lean();
        if (!snapshot) return res.status(404).json({ error: "User not found" });

        const historyIndex = Array.isArray(snapshot.jokerCrashHistory)
            ? snapshot.jokerCrashHistory.findIndex((item) => item?.active === false)
            : -1;
        if (historyIndex < 0) {
            return res.status(400).json({ error: "No active jokerCrash bet to pull" });
        }
        const historyItem = snapshot.jokerCrashHistory[historyIndex];

        const lastInfo = historyItem.info?.length ? historyItem.info[historyItem.info.length - 1] : null;

        const nextStep = toNumberOrZero(historyItem.step) + 1;
        const card = await calculateJokerCrashCard(snapshot.jokerCrashMode, lastInfo.card, operator);

        const {multi, status, imulti} = await calculateJokerCrashMulti(operator, card, lastInfo, snapshot.jokerCrashMode);
        const updatedHistoryItem = {
            ...historyItem,
            multi,
            step: nextStep,
            info: [
                ...(historyItem.info ?? []),
                {
                    step: nextStep,
                    card,
                    multi,
                    status,
                    operator,
                    imulti,
                },
            ],
        };

        var bang = 1;
        if (multi <= 0) {
            bang = -1;
            updatedHistoryItem.active = true;
            updatedHistoryItem.jokerCrashBalance =
                toNumberOrZero(updatedHistoryItem.totalWin) - toNumberOrZero(updatedHistoryItem.totalBet);
        }

        const updateResult = await User.updateOne(
            { userId, "jokerCrashHistory.active": false },
            {
                $set: { "jokerCrashHistory.$": updatedHistoryItem },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "No active jokerCrash bet to pull" });
        }

        const responseUser = {
            userId: snapshot.userId,
            balance: snapshot.balance,
            totalBet: snapshot.totalBet,
            refreshBet: snapshot.refreshBet,
            lotterybet: snapshot.lotterybet,
            jokerCrashMode: snapshot.jokerCrashMode,
            avatar: snapshot.avatar,
            altas: snapshot.altas,
            membership: snapshot.membership,
            notification: snapshot.notification ?? [],
            jokerCrashHistory: compactJokerCrashHistoryForResponse(
                (snapshot.jokerCrashHistory ?? []).map((item, idx) =>
                    idx === historyIndex ? updatedHistoryItem : item
                )
            ),
        };

        const data = {
            card: card,
            multi: multi,
            imulti: imulti,
            bang: bang,
        }
        const response = res.json({
            message: "",
            data,
            user: responseUser,
        });

        if (bang === -1) {
            Promise.resolve()
                .then(() =>
                    createJokerCrashViewEntry({
                        userId,
                        bet: updatedHistoryItem.bet,
                        win: updatedHistoryItem.win,
                        step: updatedHistoryItem.step,
                        multi: updatedHistoryItem.multi,
                        status: "bang",
                    })
                )
                .then(() =>
                    applyJokerCrashModeByUserId(
                        userId,
                        updatedHistoryItem.totalBet,
                        updatedHistoryItem.jokerCrashBalance
                    )
                )
                .then(() => scheduleCreditAndBroadcast(req.app))
                .catch((err) => {
                    console.error("jokerCrashOperator side-effect error:", err);
                });
        }

        return response;
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
        const userId = req.user.userId;
        const snapshot = await User.findOne(
            { userId, "jokerCrashHistory.active": false },
            {
                userId: 1,
                balance: 1,
                totalBet: 1,
                refreshBet: 1,
                lotterybet: 1,
                jokerCrashMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                jokerCrashHistory: { $slice: -20 },
            }
        ).lean();
        if (!snapshot) return res.status(404).json({ error: "User not found" });

        const historyIndex = Array.isArray(snapshot.jokerCrashHistory)
            ? snapshot.jokerCrashHistory.findIndex((item) => item?.active === false)
            : -1;
        if (historyIndex < 0) {
            return res.status(400).json({ error: "No active jokerCrash bet to cash out" });
        }
        const historyItem = snapshot.jokerCrashHistory[historyIndex];

        const lastHistory =
            historyIndex > 0
                ? snapshot.jokerCrashHistory[historyIndex - 1]
                : { totalBet: 0, totalWin: 0, jokerCrashBalance: 0 };

        const numAmount = toNumberOrZero(historyItem.bet);
        const numMulti = toNumberOrZero(historyItem.multi);
        const winAmount = numAmount * numMulti;

        const updatedHistoryItem = {
            ...historyItem,
            active: true,
            win: winAmount,
            totalBet: toNumberOrZero(lastHistory.totalBet) + numAmount,
            totalWin: toNumberOrZero(lastHistory.totalWin) + winAmount,
        };
        updatedHistoryItem.jokerCrashBalance =
            toNumberOrZero(updatedHistoryItem.totalWin) - toNumberOrZero(updatedHistoryItem.totalBet);

        const updateResult = await User.updateOne(
            { userId, "jokerCrashHistory.active": false },
            {
                $inc: { balance: winAmount },
                $set: { "jokerCrashHistory.$": updatedHistoryItem },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "No active jokerCrash bet to cash out" });
        }

        const data = {
            win: winAmount,
        }

        const responseUser = {
            userId: snapshot.userId,
            balance: toNumberOrZero(snapshot.balance) + winAmount,
            totalBet: snapshot.totalBet,
            refreshBet: snapshot.refreshBet,
            lotterybet: snapshot.lotterybet,
            jokerCrashMode: snapshot.jokerCrashMode,
            avatar: snapshot.avatar,
            altas: snapshot.altas,
            membership: snapshot.membership,
            notification: snapshot.notification ?? [],
            jokerCrashHistory: (snapshot.jokerCrashHistory ?? []).map((item, idx) =>
                idx === historyIndex ? updatedHistoryItem : item
            ),
        };

        const response = res.json({
            message: "",
            data,
            user: responseUser,
        });

        Promise.resolve()
            .then(() =>
                applyJokerCrashModeByUserId(
                    userId,
                    updatedHistoryItem.totalBet,
                    updatedHistoryItem.jokerCrashBalance
                )
            )
            .then(() =>
                createJokerCrashViewEntry({
                    userId,
                    bet: numAmount,
                    win: winAmount,
                    step: updatedHistoryItem.step,
                    multi: numMulti,
                    status: "cashout",
                })
            )
            .then(() => scheduleCreditAndBroadcast(req.app))
            .catch((err) => {
                console.error("jokerCrashCashOut side-effect error:", err);
            });

        return response;
    } catch (error) {
        console.error("jokerCrashCashOut error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getJokerCrashView = async (req, res) => {
    try {
        const views = await JokerCrashView.find().sort({ createdAt: -1 }).limit(12).lean();
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
        const views = await JokerCrashView.find().sort({ createdAt: -1 }).limit(12).lean();
        const data = await enrichJokerCrashViewsWithUser(views);
        ably.channels.get("jokerCrashGame").publish("jokerCrashUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [jokerCrashController] Ably publish error:", err);
        });
    }
}

async function enrichJokerCrashViewsWithUser(jokerCrashViews) {
    if (!Array.isArray(jokerCrashViews) || jokerCrashViews.length === 0) return [];

    const userIds = [...new Set(jokerCrashViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();

    const userMap = new Map(users.map((u) => [u.userId, u]));

    return jokerCrashViews.map((item) => {
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

async function applyJokerCrashModeByUserId(userId, totalBet, jokerCrashBalance) {
    const limit =
        (await JokerCrashLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};

    if (limit.limitHard != null && jokerCrashBalance > limit.limitHard) {
        await User.updateOne({ userId }, { $set: { jokerCrashMode: 2 } });
    } else if (limit.limitNormal != null && jokerCrashBalance < limit.limitNormal) {
        await User.updateOne({ userId }, { $set: { jokerCrashMode: 1 } });
    }
}

const calculateJokerCrashMulti = async (operator, card, lastInfo, mode) => {
    const prevCard = Number(lastInfo?.card ?? 1);
    const prevMulti = Number(lastInfo?.multi ?? 1);

    const increase = Math.abs(card - prevCard );

    const [cardData, increaseData] = await Promise.all([
        getJokerCrashCardConfig(prevCard),
        getJokerCrashIncreaseConfig(increase),
    ]);
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

        if(Number(mode) === 0) increaseMulti = toNumberOrZero(increaseData?.easy) || 1;
        if(Number(mode) === 1) increaseMulti = toNumberOrZero(increaseData?.normal) || 1;
        if(Number(mode) === 2) increaseMulti = toNumberOrZero(increaseData?.hard) || 1;

        if(operator === '=') cardMulti = toNumberOrZero(cardData?.equal) || 1;
        if(operator === '<') cardMulti = toNumberOrZero(cardData?.lesser) || 1;
        if(operator === '>') cardMulti = toNumberOrZero(cardData?.greater) || 1;

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
    const jokerCrashPercentage = await getJokerCrashPercentageConfig(lastCard);

    var percentages = 0;
    if(operator === '=') {
        percentages = toNumberOrZero(jokerCrashPercentage?.equal);
    } else if(operator === '<') {
        percentages = toNumberOrZero(jokerCrashPercentage?.lesser);
    } else if(operator === '>') {
        percentages = toNumberOrZero(jokerCrashPercentage?.greater);
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

async function getJokerCrashPercentageConfig(card) {
    const key = Number(card);
    if (jokerCrashPercentageCache.has(key)) return jokerCrashPercentageCache.get(key);
    const data = await JokerCrashPercentage.findOne({ card: key }).lean();
    if (data) jokerCrashPercentageCache.set(key, data);
    return data;
}

async function getJokerCrashCardConfig(card) {
    const key = Number(card);
    if (jokerCrashCardCache.has(key)) return jokerCrashCardCache.get(key);
    const data = await JokerCrashCard.findOne({ card: key }).lean();
    if (data) jokerCrashCardCache.set(key, data);
    return data;
}

async function getJokerCrashIncreaseConfig(increase) {
    const key = Number(increase);
    if (jokerCrashIncreaseCache.has(key)) return jokerCrashIncreaseCache.get(key);
    const data = await JokerCrashIncrease.findOne({ increase: key }).lean();
    if (data) jokerCrashIncreaseCache.set(key, data);
    return data;
}