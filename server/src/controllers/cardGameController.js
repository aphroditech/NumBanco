import User from "../models/User.js";
import CardGameView from "../models/CardGameView.js";
import CardGameLimit from "../models/CardGameLimit.js";
import CardGamePercentage from "../models/CardGamePercentage.js";
import Setting from "../models/Setting.js";

const cardGamePercentageCache = new Map();
let cardGameSettingCache = null;

const trimRecent = (arr, max = 30) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length <= max) return arr;
    return arr.slice(-max);
};

const buildCardGameCompactUser = (user) => {
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
        cardGameHistory: trimRecent(raw.cardGameHistory, 20),
    };
};

const calculateMultiplier = async (operator, arrow) => {
    const setting = await getCardGameSetting();
    if (operator === arrow) {
        const rawMultiplier =
            operator === ">"
                ? setting.cardGameGreaterMultipler
                : operator === "<"
                    ? setting.cardGameLesserMultipler
                    : setting.cardGameEqualMultipler;
        return toNumberOrZero(rawMultiplier);
    }
    return 0;
}

const generateCardGameNumbers = async (operator, mode) => {
    const cardGamePercentage = await getCardGamePercentage(operator);

    const percentages = Number(mode) === 0
        ? toNumberOrZero(cardGamePercentage?.easy)
        : Number(mode) === 1
            ? toNumberOrZero(cardGamePercentage?.normal)
            : toNumberOrZero(cardGamePercentage?.hard);

    const { A: left, B: right } = generate(percentages, operator);

    const arrow = left > right ? '>' : left < right ? '<' : '=';
    return { left, right, arrow };
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
                cardGameHistory: { $slice: -20 },
            }
        ).lean();
        if (!user) return res.status(404).json({ error: "User not found" });
        
        const { amount, operator } = req.body;
        const numAmount = toNumberOrZero(amount);
        if (numAmount <= 0) {
            return res.status(400).json({ error: "Invalid cardGame bet amount" });
        }
        if (numAmount > toNumberOrZero(user.balance)) {
            return res.status(400).json({ error: "You don't have enough balance to bet" });
        }

        const { left, right, arrow } = await generateCardGameNumbers(operator, user.cardGameMode);
        const multi = toNumberOrZero(await calculateMultiplier(operator, arrow));
        const numWin = toNumberOrZero(multi * numAmount);
        
        const lastHistory =
        user.cardGameHistory?.length > 0
            ? user.cardGameHistory[user.cardGameHistory.length - 1]
            : { totalBet: 0, totalWin: 0, cardGameBalance: 0 };
        
        const betEntry = {
            bet: numAmount,
            arrow: arrow,
            left: left,
            right: right,
            win: numWin,
            totalBet: toNumberOrZero(lastHistory.totalBet) + numAmount,
            totalWin: toNumberOrZero(lastHistory.totalWin) + numWin,
            cardGameBalance: toNumberOrZero(lastHistory.cardGameBalance) + numWin - numAmount,
            createAt: new Date(),
        };
        const nextBalance = toNumberOrZero(user.balance) + numWin - numAmount;
        const updateResult = await User.updateOne(
            { userId, balance: { $gte: numAmount } },
            {
                $inc: {
                    balance: numWin - numAmount,
                    totalBet: numAmount,
                    refreshBet: numAmount,
                    lotterybet: numAmount,
                },
                $push: {
                    cardGameHistory: betEntry,
                },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "CardGame bet conflict" });
        }
        const data = {
            left: left,
            right: right,
            arrow: arrow,
            win: numWin,
        }
        
        const response = res.json({
            message: "",
            data,
            user: buildCardGameCompactUser({
                ...user,
                balance: nextBalance,
                totalBet: toNumberOrZero(user.totalBet) + numAmount,
                refreshBet: toNumberOrZero(user.refreshBet) + numAmount,
                lotterybet: toNumberOrZero(user.lotterybet) + numAmount,
                cardGameHistory: [...(user.cardGameHistory ?? []), betEntry].slice(-20),
            }),
        });

        Promise.resolve()
            .then(() => applyCardGameModeByUserId(userId, betEntry.totalBet, betEntry.cardGameBalance))
            .then(() =>
                createCardGameViewEntry({
                    userId,
                    bet: numAmount,
                    win: numWin,
                    arrow: arrow,
                    left: left,
                    right: right,
                    time: new Date(),
                })
            )
            .then(() => scheduleCreditAndBroadcast(req.app))
            .catch((err) => {
                console.error("cardGame bet side-effect error:", err);
            });

        return response;
    }
    catch (err) {
        console.log("Error in bet:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

export const getCardGameView = async (req, res) => {
    try {
        const views = await CardGameView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichCardGameViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


const cardGameUserProjection = {
    "wallets.eth.privateKey": 0,
    "wallets.bsc.privateKey": 0,
    "wallets.tron.privateKey": 0,
    password: 0,
    country: 0,
    pumpingMode: 0,
    fishingMode: 0,
    rubicMode: 0,
    cardGameMode: 0,
    partnerId: 0,
    partnerActivity: 0,
    lastClickDate: 0,
    canWithdraw: 0,
};

const getCardGameUser = async (userId) => {
    return User.findOne({ userId }, cardGameUserProjection);
};

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getLastCardGameView = async () => {
    const last = await CardGameView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createCardGameViewEntry = async ({
    userId,
    bet,
    win,
    arrow,
    left,
    right,
    time,
}) => {
    const last = await getLastCardGameView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const cardGameView = new CardGameView({
        userId,
        bet: numBet,
        win: numWin,
        arrow: arrow,
        left: left,
        right: right,
        totalBet,
        totalWin,
        cardGameBalance: totalWin - totalBet,
        isUser: 1,
        time: time,
    });

    await cardGameView.save();
    return cardGameView;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await CardGameView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichCardGameViewsWithUser(views);
        ably.channels.get("cardGame").publish("cardGameUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [cardGameController] Ably publish error:", err);
        });
    }
}

async function enrichCardGameViewsWithUser(cardGameViews) {
    if (!Array.isArray(cardGameViews) || cardGameViews.length === 0) return [];

    const userIds = [...new Set(cardGameViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();
    const userMap = new Map(users.map((u) => [u.userId, u]));

    return cardGameViews.map((item) => {
        const obj = { ...item };
        delete obj.isUser;
        delete obj.totalBet;
        delete obj.totalWin;
        delete obj.cardGameBalance;

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

async function applyCardGameMode(user, totalBet, cardGameBalance) {
    const limit =
        (await CardGameLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && cardGameBalance > limit.limitHard) {
        user.cardGameMode = 2;
    } else if (limit.limitNormal != null && cardGameBalance < limit.limitNormal) {
        user.cardGameMode = 1;
    }
}

async function applyCardGameModeByUserId(userId, totalBet, cardGameBalance) {
    const limit =
        (await CardGameLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && cardGameBalance > limit.limitHard) {
        await User.updateOne({ userId }, { $set: { cardGameMode: 2 } });
    } else if (limit.limitNormal != null && cardGameBalance < limit.limitNormal) {
        await User.updateOne({ userId }, { $set: { cardGameMode: 1 } });
    }
}

async function getCardGamePercentage(operator) {
    const key = String(operator);
    if (cardGamePercentageCache.has(key)) return cardGamePercentageCache.get(key);
    const data = await CardGamePercentage.findOne({ arrow: key }).lean();
    if (data) cardGamePercentageCache.set(key, data);
    return data;
}

async function getCardGameSetting() {
    if (cardGameSettingCache) return cardGameSettingCache;
    const data = await Setting.findOne({}).lean();
    cardGameSettingCache = data || {};
    return cardGameSettingCache;
}


function generate(p, symbol) {
    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  
    const r = rand(1, 100);
    const enforce = r <= p;
  
    let A, B;
  
    switch (symbol) {
      case ">":
        if (enforce) {
          B = rand(1, 5);
          A = rand(Math.max(B + 1, 1), 13);
        } else {
          B = rand(1, 5);
          A = rand(1, Math.min(B, 13));
        }
        break;
  
      case "<":
        if (enforce) {
          A = rand(1, 13);
          B = rand(Math.max(A + 1, 1), 5);
          if (A >= 5) { // fallback (since B max is 5)
            A = rand(1, 4);
            B = rand(A + 1, 5);
          }
        } else {
          A = rand(1, 13);
          B = rand(1, Math.min(A, 5));
        }
        break;
  
      case "=":
        if (enforce) {
          B = rand(1, 5);
          A = B; // must match B's range
        } else {
          B = rand(1, 5);
          do {
            A = rand(1, 13);
          } while (A === B);
        }
        break;
  
      case ">=":
        if (enforce) {
          B = rand(1, 5);
          A = rand(B, 13);
        } else {
          B = rand(2, 5);
          A = rand(1, B - 1);
        }
        break;
  
      case "<=":
        if (enforce) {
          B = rand(1, 5);
          A = rand(1, Math.min(B, 13));
        } else {
          B = rand(1, 5);
          A = rand(Math.max(B + 1, 1), 13);
        }
        break;
  
      default:
        throw new Error("Invalid symbol");
    }
  
    return { A, B };
}