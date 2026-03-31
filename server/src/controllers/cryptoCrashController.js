import User from "../models/User.js";
import CryptoCrashView from "../models/CryptoCrashView.js";
import CryptoCrashLimit from "../models/CryptoCrashLimit.js";
// import CryptoCrashCard from "../models/CryptoCrashCard.js";
import CryptoCrashPercentage from "../models/CryptoCrashPercentage.js";
// import CryptoCrashIncrease from "../models/CryptoCrashIncrease.js";

// Prevent concurrent `pullStay` updates for the same user.
// VersionError happens when two requests update the same user doc at nearly the same time.
const cryptoCrashPullStayLocks = new Map();
const cryptoCrashPercentageCache = new Map();
const cryptoCrashCardCache = new Map();
const cryptoCrashIncreaseCache = new Map();

const cryptoCrashUserProjection = {
    "wallets.eth.privateKey": 0,
    "wallets.bsc.privateKey": 0,
    "wallets.tron.privateKey": 0,
    password: 0,
    country: 0,
    pumpingMode: 0,
    fishingMode: 0,
    cryptoCrashMode: 0,
    rubicMode: 0,
    partnerId: 0,
    partnerActivity: 0,
    lastClickDate: 0,
    canWithdraw: 0,
};

const trimRecent = (arr, max = 1000) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length <= max) return arr;
    return arr.slice(-max);
};

const compactCryptoCrashHistoryForResponse = (history, { maxRounds = 8, maxInfo = 8 } = {}) => {
    if (!Array.isArray(history)) return [];
    return history.map((item) => ({
        ...item,
        info: trimRecent(item?.info, maxInfo),
    }));
};

const buildCryptoCrashCompactUser = (user) => {
    const raw = typeof user?.toObject === "function" ? user.toObject() : user;
    if (!raw || typeof raw !== "object") return raw;

    const cryptoCrashHistory = Array.isArray(raw.cryptoCrashHistory)
        ? raw.cryptoCrashHistory
              .map((item) => {
                  if (item?.active === false) return item;
                  return {
                      ...item,
                      info: trimRecent(item?.info, 100),
                  };
              })
        : [];

    return {
        userId: raw.userId,
        balance: raw.balance,
        totalBet: raw.totalBet,
        refreshBet: raw.refreshBet,
        lotterybet: raw.lotterybet,
        cryptoCrashMode: raw.cryptoCrashMode,
        avatar: raw.avatar,
        altas: raw.altas,
        membership: raw.membership,
        notification: trimRecent(raw.notification, 20),
        cryptoCrashHistory: compactCryptoCrashHistoryForResponse(cryptoCrashHistory),
    };
};

const sendCryptoCrashUserResponse = (res, message, user, extra = {}) => {
    return res.json({
        message,
        ...extra,
        user: buildCryptoCrashCompactUser(user),
    });
};

const getActiveCryptoCrashHistoryItem = (user) => {
    return user.cryptoCrashHistory?.find((item) => item.active === false) ?? null;
};

const addToThousand = (current, delta) => {
    return (
        (Number(1000 * toNumberOrZero(current)) + Number(1000 * toNumberOrZero(delta))) /
        1000
    );
};

const getLastCryptoCrashView = async () => {
    const last = await CryptoCrashView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createCryptoCrashViewEntry = async ({
    userId,
    bet,
    win,
    step,
    multi,
    status,
}) => {
    const last = await getLastCryptoCrashView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const cryptoCrashBalance = totalWin - totalBet;

    const cryptoCrashView = new CryptoCrashView({
        userId,
        bet: numBet,
        win: numWin,
        step: toNumberOrZero(step),
        multi: toNumberOrZero(multi),
        totalBet,
        totalWin,
        cryptoCrashBalance,
        isUser: 1,
        status,
        time: new Date(),
    });

    await cryptoCrashView.save();
    return cryptoCrashView;
};

export const bet = async (req, res) => {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid cryptoCrash bet amount" });
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
            cryptoCrashMode: 1,
            avatar: 1,
            altas: 1,
            membership: 1,
            notification: { $slice: -20 },
            cryptoCrashHistory: 1,
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
                cryptoCrashMode: snapshot.cryptoCrashMode,
                avatar: snapshot.avatar,
                altas: snapshot.altas,
                membership: snapshot.membership,
                notification: snapshot.notification ?? [],
                cryptoCrashHistory: snapshot.cryptoCrashHistory ?? [],
            },
        });
    }

    const lastHistory =
        Array.isArray(snapshot.cryptoCrashHistory) && snapshot.cryptoCrashHistory.length > 0
            ? snapshot.cryptoCrashHistory[snapshot.cryptoCrashHistory.length - 1]
            : { totalBet: 0, totalWin: 0, cryptoCrashBalance: 0 };

    const now = new Date();
    const betEntry = {
        bet: amount,
        win: 0,
        step: 0,
        multi: 1,
        totalBet: toNumberOrZero(lastHistory.totalBet) + amount,
        totalWin: toNumberOrZero(lastHistory.totalWin),
        cryptoCrashBalance: toNumberOrZero(lastHistory.cryptoCrashBalance),
        info: [],
        createAt: now,
    };

    const updateResult = await User.updateOne(
        {
            userId,
            balance: { $gte: amount },
            "cryptoCrashHistory.active": { $ne: false },
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
                    type: "cryptoCrash",
                },
                cryptoCrashHistory: betEntry,
            },
        }
    );

    if (!updateResult?.matchedCount) {
        return res.status(409).json({ error: "CryptoCrash bet already in progress" });
    }

    const updatedUser = {
        userId: snapshot.userId,
        balance: toNumberOrZero(snapshot.balance) - amount,
        totalBet: addToThousand(snapshot.totalBet, amount),
        refreshBet: addToThousand(snapshot.refreshBet, amount),
        lotterybet: addToThousand(snapshot.lotterybet, amount),
        cryptoCrashMode: snapshot.cryptoCrashMode,
        avatar: snapshot.avatar,
        altas: snapshot.altas,
        membership: snapshot.membership,
        notification: snapshot.notification ?? [],
        cryptoCrashHistory: [...(snapshot.cryptoCrashHistory ?? []), betEntry],
    };

    return res.json({
        message: "",
        status: "success",
        user: updatedUser,
    });
};

export const flipCoin = async (req, res) => {
    try {
        const { userId } = req.user;
        const { coin } = req.body;

        const snapshot = await User.findOne(
            { userId, "cryptoCrashHistory.active": false },
            {
                userId: 1,
                balance: 1,
                totalBet: 1,
                refreshBet: 1,
                lotterybet: 1,
                cryptoCrashMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                cryptoCrashHistory: 1,
            }
        ).lean();
        if (!snapshot) return res.status(404).json({ error: "User not found" });

        const historyIndex = Array.isArray(snapshot.cryptoCrashHistory)
            ? snapshot.cryptoCrashHistory.findIndex((item) => item?.active === false)
            : -1;
        if (historyIndex < 0) {
            return res.status(400).json({ error: "No active cryptoCrash bet to pull" });
        }
        const historyItem = snapshot.cryptoCrashHistory[historyIndex];

        const lastInfo = historyItem.info?.length ? historyItem.info[historyItem.info.length - 1] : null;

        const nextStep = toNumberOrZero(historyItem.step) + 1;
        
        const result = await calculateCryptoCrashResult(
            coin,
            historyItem.step,
            Number(snapshot.cryptoCrashMode)
        );


        const status = result === coin ? 1 : 0;
        const imulti = result === coin ? 1.98 : 0;
        const multi = historyItem.multi * imulti;

        const updatedHistoryItem = {
            ...historyItem,
            multi,
            step: nextStep,
            info: [
                ...(historyItem.info ?? []),
                {
                    step: nextStep,
                    coin,
                    result,
                    status,
                    multi,
                    imulti,
                },
            ],
        };

        var bang = 1;
        if (multi === 0) {
            bang = -1;
            updatedHistoryItem.active = true;
            updatedHistoryItem.cryptoCrashBalance =
                toNumberOrZero(updatedHistoryItem.totalWin) - toNumberOrZero(updatedHistoryItem.totalBet);
        }

        const updateResult = await User.updateOne(
            { userId, "cryptoCrashHistory.active": false },
            {
                $set: { "cryptoCrashHistory.$": updatedHistoryItem },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "No active cryptoCrash bet to pull" });
        }

        const responseUser = {
            userId: snapshot.userId,
            balance: snapshot.balance,
            totalBet: snapshot.totalBet,
            refreshBet: snapshot.refreshBet,
            lotterybet: snapshot.lotterybet,
            cryptoCrashMode: snapshot.cryptoCrashMode,
            avatar: snapshot.avatar,
            altas: snapshot.altas,
            membership: snapshot.membership,
            notification: snapshot.notification ?? [],
            cryptoCrashHistory: compactCryptoCrashHistoryForResponse(
                (snapshot.cryptoCrashHistory ?? []).map((item, idx) =>
                    idx === historyIndex ? updatedHistoryItem : item
                )
            ),
        };

        const data = {
            coin: coin,
            result: result,
            status: status,
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
                    createCryptoCrashViewEntry({
                        userId,
                        bet: updatedHistoryItem.bet,
                        win: updatedHistoryItem.win,
                        step: updatedHistoryItem.step,
                        multi: updatedHistoryItem.multi,
                        status: "bang",
                    })
                )
                .then(() =>
                    applyCryptoCrashModeByUserId(
                        userId,
                        updatedHistoryItem.totalBet,
                        updatedHistoryItem.cryptoCrashBalance
                    )
                )
                .then(() => scheduleCreditAndBroadcast(req.app))
                .catch((err) => {
                    console.error("cryptoCrashOperator side-effect error:", err);
                });
        }

        return response;
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    } finally {
        const { userId } = req.user || {};
        if (userId) cryptoCrashPullStayLocks.delete(userId);
    }
};

export const cryptoCrashCashOut = async (req, res) => {
    try {
        const userId = req.user.userId;
        const snapshot = await User.findOne(
            { userId, "cryptoCrashHistory.active": false },
            {
                userId: 1,
                balance: 1,
                totalBet: 1,
                refreshBet: 1,
                lotterybet: 1,
                cryptoCrashMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                cryptoCrashHistory: 1,
            }
        ).lean();
        if (!snapshot) return res.status(404).json({ error: "User not found" });

        const historyIndex = Array.isArray(snapshot.cryptoCrashHistory)
            ? snapshot.cryptoCrashHistory.findIndex((item) => item?.active === false)
            : -1;
        if (historyIndex < 0) {
            return res.status(400).json({ error: "No active cryptoCrash bet to cash out" });
        }
        const historyItem = snapshot.cryptoCrashHistory[historyIndex];

        const lastHistory =
            historyIndex > 0
                ? snapshot.cryptoCrashHistory[historyIndex - 1]
                : { totalBet: 0, totalWin: 0, cryptoCrashBalance: 0 };

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
        updatedHistoryItem.cryptoCrashBalance =
            toNumberOrZero(updatedHistoryItem.totalWin) - toNumberOrZero(updatedHistoryItem.totalBet);

        const updateResult = await User.updateOne(
            { userId, "cryptoCrashHistory.active": false },
            {
                $inc: { balance: winAmount },
                $set: { "cryptoCrashHistory.$": updatedHistoryItem },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "No active cryptoCrash bet to cash out" });
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
            cryptoCrashMode: snapshot.cryptoCrashMode,
            avatar: snapshot.avatar,
            altas: snapshot.altas,
            membership: snapshot.membership,
            notification: snapshot.notification ?? [],
            cryptoCrashHistory: (snapshot.cryptoCrashHistory ?? []).map((item, idx) =>
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
                applyCryptoCrashModeByUserId(
                    userId,
                    updatedHistoryItem.totalBet,
                    updatedHistoryItem.cryptoCrashBalance
                )
            )
            .then(() =>
                createCryptoCrashViewEntry({
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
                console.error("cryptoCrashCashOut side-effect error:", err);
            });

        return response;
    } catch (error) {
        console.error("cryptoCrashCashOut error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getCryptoCrashView = async (req, res) => {
    try {
        const views = await CryptoCrashView.find().sort({ createdAt: -1 }).limit(12).lean();
        const data = await enrichCryptoCrashViewsWithUser(views);
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

const bangCryptoCrash = (historyItem) => {
    historyItem.active = true;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await CryptoCrashView.find().sort({ createdAt: -1 }).limit(12).lean();
        const data = await enrichCryptoCrashViewsWithUser(views);
        setTimeout(() => {
            ably.channels.get("cryptoCrashGame").publish("cryptoCrashUpdate", { updatedData: data }).catch((err) => {
                console.error("❌ [cryptoCrashController] Ably publish error:", err);
            });
        }, 2000);
    }
}

async function enrichCryptoCrashViewsWithUser(cryptoCrashViews) {
    if (!Array.isArray(cryptoCrashViews) || cryptoCrashViews.length === 0) return [];

    const userIds = [...new Set(cryptoCrashViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();

    const userMap = new Map(users.map((u) => [u.userId, u]));

    return cryptoCrashViews.map((item) => {
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

async function applyCryptoCrashMode(user, totalBet, cryptoCrashBalance) {
    const limit =
        (await CryptoCrashLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && cryptoCrashBalance > limit.limitHard) {
        user.cryptoCrashMode = 2;
    } else if (limit.limitNormal != null && cryptoCrashBalance < limit.limitNormal) {
        user.cryptoCrashMode = 1;
    }
}

async function applyCryptoCrashModeByUserId(userId, totalBet, cryptoCrashBalance) {
    const limit =
        (await CryptoCrashLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};

    if (limit.limitHard != null && cryptoCrashBalance > limit.limitHard) {
        await User.updateOne({ userId }, { $set: { cryptoCrashMode: 2 } });
    } else if (limit.limitNormal != null && cryptoCrashBalance < limit.limitNormal) {
        await User.updateOne({ userId }, { $set: { cryptoCrashMode: 1 } });
    }
}

const calculateCryptoCrashMulti = async (operator, card, lastInfo, mode) => {
    const prevCard = Number(lastInfo?.card ?? 1);
    const prevMulti = Number(lastInfo?.multi ?? 1);

    const increase = Math.abs(card - prevCard );

    const [cardData, increaseData] = await Promise.all([
        getCryptoCrashCardConfig(prevCard),
        getCryptoCrashIncreaseConfig(increase),
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

const calculateCryptoCrashCard = async (mode, lastCard, operator) => {
    const cryptoCrashPercentage = await getCryptoCrashPercentageConfig(lastCard);

    var percentages = 0;
    if(operator === '=') {
        percentages = toNumberOrZero(cryptoCrashPercentage?.equal);
    } else if(operator === '<') {
        percentages = toNumberOrZero(cryptoCrashPercentage?.lesser);
    } else if(operator === '>') {
        percentages = toNumberOrZero(cryptoCrashPercentage?.greater);
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

async function getCryptoCrashPercentageConfig(card) {
    const key = Number(card);
    if (cryptoCrashPercentageCache.has(key)) return cryptoCrashPercentageCache.get(key);
    // const data = await CryptoCrashPercentage.findOne({ card: key }).lean();
    const data = [];
    if (data) cryptoCrashPercentageCache.set(key, data);
    return data;
}

async function getCryptoCrashCardConfig(card) {
    const key = Number(card);
    if (cryptoCrashCardCache.has(key)) return cryptoCrashCardCache.get(key);
    // const data = await CryptoCrashCard.findOne({ card: key }).lean();
    const data = [];
    if (data) cryptoCrashCardCache.set(key, data);
    return data;
}

async function getCryptoCrashIncreaseConfig(increase) {
    const key = Number(increase);
    if (cryptoCrashIncreaseCache.has(key)) return cryptoCrashIncreaseCache.get(key);
    // const data = await CryptoCrashIncrease.findOne({ increase: key }).lean();
    const data = [];
    if (data) cryptoCrashIncreaseCache.set(key, data);
    return data;
}

const calculateCryptoCrashResult = async (coin, step, mode) => {
    const cryptocrashpercentage = await CryptoCrashPercentage
        .findOne({ from: { $lte: step }, to: { $gte: step } })
        .lean();

    if (!cryptocrashpercentage) {
        console.warn("No percentage config found for step:", step);
        return coin; // fallback (or handle differently)
    }

    let percentages = 0;

    switch (Number(mode)) {
        case 0:
            percentages = cryptocrashpercentage.easy ?? 50;
            break;
        case 1:
            percentages = cryptocrashpercentage.normal ?? 50;
            break;
        case 2:
            percentages = cryptocrashpercentage.hard ?? 50;
            break;
        default:
            console.warn("Invalid mode:", mode);
            percentages = 50;
    }

    const random = Math.floor(Math.random() * 100) + 1;

    return random <= percentages ? coin : (coin === 1 ? 0 : 1);
};