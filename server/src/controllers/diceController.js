import User from "../models/User.js";
import DiceView from "../models/DiceView.js";

const trimRecent = (arr, max = 30) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length <= max) return arr;
    return arr.slice(-max);
};

const buildDiceCompactUser = (user) => {
    const raw = typeof user?.toObject === "function" ? user.toObject() : user;
    if (!raw || typeof raw !== "object") return raw;

    return {
        userId: raw.userId,
        balance: raw.balance,
        totalBet: raw.totalBet,
        refreshBet: raw.refreshBet,
        lotterybet: raw.lotterybet,
        cardGameMode: raw.cardGameMode,
        avatar: raw.avatar,
        altas: raw.altas,
        membership: raw.membership,
        notification: trimRecent(raw.notification, 20),
        diceHistory: trimRecent(raw.diceHistory, 20),
    };
};

const generateDiceNumbers = async () => {
    return Math.floor(Math.random() * 6) + 1;
}

const calculateWin = async (dice, targetTop) => {
    console.log("dice", dice, "targetTop", targetTop);
    if(targetTop === 0) {
        if ( dice === 1 || dice === 2 || dice === 3) return 1.97;
        else return 0;
    } else if(targetTop === 1) {
        if ( dice === 4 || dice === 5 || dice === 6) return 1.97;
        else return 0;
    } else if(targetTop === 2) {
        if ( dice === 2 || dice === 4 || dice === 6) return 1.97;
        else return 0;
    } else {
        if ( dice === 1 || dice === 3 || dice === 5) return 1.97;
        else return 0;
    }
}

export const bet = async (req, res) => {
    try {

        const userId = req.user.userId;
        const user = await User.findOne(
            { userId },
            {
                userId: 1,
                balance: 1,
                totalBet: 1,
                refreshBet: 1,
                lotterybet: 1,
                cardGameMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                diceHistory: { $slice: -20 },
            }
        ).lean();
        if (!user) return res.status(404).json({ error: "User not found" });
        
        const { amount, targetTop } = req.body;
        const numAmount = toNumberOrZero(amount);
        if (numAmount <= 0) {
            return res.status(400).json({ error: "Invalid dice bet amount" });
        }
        if (numAmount > toNumberOrZero(user.balance)) {
            return res.status(400).json({ error: "You don't have enough balance to bet" });
        }

        const dice = await generateDiceNumbers();

        const win = await calculateWin(dice, targetTop);
        
        const lastHistory =
        user.diceHistory?.length > 0
            ? user.diceHistory[user.diceHistory.length - 1]
            : { totalBet: 0, totalWin: 0, diceBalance: 0 };
        
        const betEntry = {
            bet: numAmount,
            dice: dice,
            type: targetTop,
            win: numAmount * win,
            totalBet: toNumberOrZero(lastHistory.totalBet) + numAmount,
            totalWin: toNumberOrZero(lastHistory.totalWin) + numAmount * win,
            diceBalance: toNumberOrZero(lastHistory.diceBalance) + numAmount * win - numAmount,
            createAt: new Date(),
        };
        const nextBalance = toNumberOrZero(user.balance) + numAmount * win - numAmount;
        const updateResult = await User.updateOne(
            { userId, balance: { $gte: numAmount } },
            {
                $inc: {
                    balance: numAmount * win - numAmount,
                    totalBet: numAmount,
                    refreshBet: numAmount,
                    lotterybet: numAmount,
                },
                $push: {
                    diceHistory: betEntry,
                },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "Dice bet conflict" });
        }
        const data = {
            dice,
            win: numAmount * win,
        }
        
        const response = res.json({
            message: "",
            data,
            user: buildDiceCompactUser({
                ...user,
                balance: nextBalance,
                totalBet: toNumberOrZero(user.totalBet) + numAmount,
                refreshBet: toNumberOrZero(user.refreshBet) + numAmount,
                lotterybet: toNumberOrZero(user.lotterybet) + numAmount,
                diceHistory: [...(user.diceHistory ?? []), betEntry].slice(-20),
            }),
        });

        Promise.resolve()
            .then(() =>
                createDiceViewEntry({
                    userId,
                    bet: numAmount,
                    win: numAmount * win,
                    dice,
                    targetTop,
                    time: new Date(),
                })
            )
            .then(() => scheduleCreditAndBroadcast(req.app))
            .catch((err) => {
                console.error("dice bet side-effect error:", err);
            });

        return response;
    }
    catch (err) {
        console.log("Error in bet:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

export const getDiceHistory = async (req, res) => {
    try {
        const views = await DiceView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichDiceViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getLastDiceView = async () => {
    const last = await DiceView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createDiceViewEntry = async ({
    userId,
    bet,
    win,
    dice,
    targetTop,
    time,
}) => {
    const last = await getLastDiceView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const diceView = new DiceView({
        userId,
        bet: numBet,
        win: numWin,
        dice: dice,
        type: targetTop,
        totalBet,
        totalWin,
        diceBalance: totalWin - totalBet,
        isUser: 1,
        time: time,
    });

    await diceView.save();
    return diceView;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await DiceView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichDiceViewsWithUser(views);
        ably.channels.get("diceGame").publish("diceUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [diceController] Ably publish error:", err);
        });
    }
}

async function enrichDiceViewsWithUser(diceViews) {
    if (!Array.isArray(diceViews) || diceViews.length === 0) return [];

    const userIds = [...new Set(diceViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();
    const userMap = new Map(users.map((u) => [u.userId, u]));

    return diceViews.map((item) => {
        const obj = { ...item };
        delete obj.isUser;
        delete obj.totalBet;
        delete obj.totalWin;
        delete obj.diceBalance;

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
