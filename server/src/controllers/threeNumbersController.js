import User from "../models/User.js";
import ThreeNumbersView from "../models/ThreeNumbersView.js";
// import ThreeNumbersLimit from "../models/ThreeNumbersLimit.js";
import ThreeNumbersPercentage from "../models/ThreeNumbersPercentage.js";
import Setting from "../models/Setting.js";

const threeNumbersPercentageCache = new Map();
let threeNumbersSettingCache = null;

const trimRecent = (arr, max = 30) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length <= max) return arr;
    return arr.slice(-max);
};

const buildThreeNumbersCompactUser = (user) => {
    const raw = typeof user?.toObject === "function" ? user.toObject() : user;
    if (!raw || typeof raw !== "object") return raw;

    return {
        userId: raw.userId,
        balance: raw.balance,
        totalBet: raw.totalBet,
        refreshBet: raw.refreshBet,
        lotterybet: raw.lotterybet,
        threeNumbersMode: raw.threeNumbersMode,
        avatar: raw.avatar,
        altas: raw.altas,
        membership: raw.membership,
        notification: trimRecent(raw.notification, 20),
        threeNumbersHistory: trimRecent(raw.threeNumbersHistory, 20),
    };
};

const calculateMultiplier = async (operator, arrow) => {
    const setting = await getThreeNumbersSetting();
    if (operator === arrow) {
        const rawMultiplier =
            operator === ">"
                ? setting.threeNumbersGreaterMultipler
                : operator === "<"
                    ? setting.threeNumbersLesserMultipler
                    : setting.threeNumbersEqualMultipler;
        return toNumberOrZero(rawMultiplier);
    }
    return 0;
};

/** Pick one row's `string` using weights in `column` ("first" | "second" | "third"). */
const pickSymbolByWeights = (rows, column) => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    let total = 0;
    const weights = rows.map((row) => {
        const w = Math.max(0, Number(row[column]) || 0);
        total += w;
        return w;
    });
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (let i = 0; i < rows.length; i++) {
        r -= weights[i];
        if (r < 0) return String(rows[i].string);
    }
    return String(rows[rows.length - 1].string);
};

const UNIFORM_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const FALLBACK_SECOND = [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ...UNIFORM_DIGITS];

const generateThreeNumbersNumbers = async () => {
    const percentages = await ThreeNumbersPercentage.find({}).lean();

    let first = pickSymbolByWeights(percentages, "first");
    let second = pickSymbolByWeights(percentages, "second");
    let third = pickSymbolByWeights(percentages, "third");

    if(Number(first) !== 0) second = '.';
    if(Number(third) > 2) second = '.';

    if (first == null) first = UNIFORM_DIGITS[Math.floor(Math.random() * 10)];
    if (second == null) second = FALLBACK_SECOND[Math.floor(Math.random() * FALLBACK_SECOND.length)];
    if (third == null) third = UNIFORM_DIGITS[Math.floor(Math.random() * 10)];

    const result = `${first}${second}${third}`;
    return { first, second, third, result };
};

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
                threeNumbersMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                threeNumbersHistory: { $slice: -20 },
            }
        ).lean();
        if (!user) return res.status(404).json({ error: "User not found" });

        const { amount } = req.body;
        const numAmount = toNumberOrZero(amount);
        if (numAmount <= 0) {
            return res.status(400).json({ error: "Invalid threeNumbers bet amount" });
        }
        if (numAmount > toNumberOrZero(user.balance)) {
            return res.status(400).json({ error: "You don't have enough balance to bet" });
        }
        
        const { first, second, third, result } = await generateThreeNumbersNumbers();
        const multi = Number(result);

        const numWin = toNumberOrZero(multi * numAmount);
        
        const lastHistory =
        user.threeNumbersHistory?.length > 0
            ? user.threeNumbersHistory[user.threeNumbersHistory.length - 1]
            : { totalBet: 0, totalWin: 0, threeNumbersBalance: 0 };
        
        const betEntry = {
            bet: numAmount,
            result: result,
            multi: multi,
            win: numWin,
            totalBet: toNumberOrZero(lastHistory.totalBet) + numAmount,
            totalWin: toNumberOrZero(lastHistory.totalWin) + numWin,
            threeNumbersBalance: toNumberOrZero(lastHistory.threeNumbersBalance) + numWin - numAmount,
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
                    threeNumbersHistory: betEntry,
                },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "ThreeNumbers bet conflict" });
        }
        const data = {
            result: result,
            multi: multi,
            win: numWin,
            first: first,
            second: second,
            third: third,
        }
        
        const response = res.json({
            message: "",
            data,
            user: buildThreeNumbersCompactUser({
                ...user,
                balance: nextBalance,
                totalBet: toNumberOrZero(user.totalBet) + numAmount,
                refreshBet: toNumberOrZero(user.refreshBet) + numAmount,
                lotterybet: toNumberOrZero(user.lotterybet) + numAmount,
                threeNumbersHistory: [...(user.threeNumbersHistory ?? []), betEntry].slice(-20),
            }),
        });

        Promise.resolve()
            // .then(() => applyThreeNumbersModeByUserId(userId, betEntry.totalBet, betEntry.threeNumbersBalance))
            .then(() =>
                createThreeNumbersViewEntry({
                    userId,
                    bet: numAmount,
                    win: numWin,
                    result: result,
                    multi: multi,
                    time: new Date(),
                })
            )
            .then(() => scheduleCreditAndBroadcast(req.app))
            .catch((err) => {
                console.error("threeNumbers bet side-effect error:", err);
            });

        return response;
    }
    catch (err) {
        console.log("Error in bet:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

export const getThreeNumbersView = async (req, res) => {
    try {
        const views = await ThreeNumbersView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichThreeNumbersViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const threeNumbersUserProjection = {
    "wallets.eth.privateKey": 0,
    "wallets.bsc.privateKey": 0,
    "wallets.tron.privateKey": 0,
    password: 0,
    country: 0,
    pumpingMode: 0,
    fishingMode: 0,
    rubicMode: 0,
    threeNumbersMode: 0,
    cardGameMode: 0,
    partnerId: 0,
    partnerActivity: 0,
    lastClickDate: 0,
    canWithdraw: 0,
};

const getThreeNumbersUser = async (userId) => {
    return User.findOne({ userId }, threeNumbersUserProjection);
};

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getLastThreeNumbersView = async () => {
    const last = await ThreeNumbersView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createThreeNumbersViewEntry = async ({
    userId,
    bet,
    win,
    result,
    multi,
    time,
}) => {
    const last = await getLastThreeNumbersView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const threeNumbersView = new ThreeNumbersView({
        userId,
        bet: numBet,
        result: result,
        multi: multi,
        win: numWin,
        totalBet,
        totalWin,
        threeNumbersBalance: totalWin - totalBet,
        isUser: 1,
        time: time,
    });

    await threeNumbersView.save();
    return threeNumbersView;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await ThreeNumbersView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichThreeNumbersViewsWithUser(views);
        setTimeout(() => {
            ably.channels.get("threeNumbers").publish("threeNumbersUpdate", { updatedData: data }).catch((err) => {
                console.error("❌ [threeNumbersController] Ably publish error:", err);
            });
        }, 2000);
    }
}

async function enrichThreeNumbersViewsWithUser(threeNumbersViews) {
    if (!Array.isArray(threeNumbersViews) || threeNumbersViews.length === 0) return [];

    const userIds = [...new Set(threeNumbersViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();
    const userMap = new Map(users.map((u) => [u.userId, u]));

    return threeNumbersViews.map((item) => {
        const obj = { ...item };
        delete obj.isUser;
        delete obj.totalBet;
        delete obj.totalWin;
        delete obj.threeNumbersBalance;

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

async function applyThreeNumbersMode(user, totalBet, threeNumbersBalance) {
    const limit =
        (await ThreeNumbersLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && threeNumbersBalance > limit.limitHard) {
        user.threeNumbersMode = 2;
    } else if (limit.limitNormal != null && threeNumbersBalance < limit.limitNormal) {
        user.threeNumbersMode = 1;
    }
}

async function applyThreeNumbersModeByUserId(userId, totalBet, threeNumbersBalance) {
    const limit =
        (await ThreeNumbersLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && threeNumbersBalance > limit.limitHard) {
        await User.updateOne({ userId }, { $set: { threeNumbersMode: 2 } });
    } else if (limit.limitNormal != null && threeNumbersBalance < limit.limitNormal) {
        await User.updateOne({ userId }, { $set: { threeNumbersMode: 1 } });
    }
}

async function getThreeNumbersPercentage(operator) {
    const key = String(operator);
    if (threeNumbersPercentageCache.has(key)) return threeNumbersPercentageCache.get(key);
    const data = await ThreeNumbersPercentage.findOne({ arrow: key }).lean();
    if (data) threeNumbersPercentageCache.set(key, data);
    return data;
}

async function getThreeNumbersSetting() {
    if (threeNumbersSettingCache) return threeNumbersSettingCache;
    const data = await Setting.findOne({}).lean();
    threeNumbersSettingCache = data || {};
    return threeNumbersSettingCache;
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