import User from "../models/User.js";
import KenoView from "../models/KenoView.js";
import KenoControl from "../models/KenoControl.js";
import Setting from "../models/Setting.js";
import KenoLimit from "../models/KenoLimit.js";

const trimRecent = (arr, max = 30) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length <= max) return arr;
    return arr.slice(-max);
};

const buildKenoCompactUser = (user) => {
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
        kenoHistory: trimRecent(raw.kenoHistory, 20),
    };
};

const generateKenoNumbers = async (type, numbers, mode) => {
    const count = 10;
    const max = 40;
    const riskKey = normalizeRiskKey(type);
    const numbersLength = numbers.length;
    
    const keno = new Set();
    const control = await KenoControl.findOne({ numbersLength: numbersLength }).lean();
    if (!control) {
        return [];
    }
        
    while (keno.size < count) {
      const random = Math.floor(Math.random() * max) + 1;
      keno.add(random);
    }

    const winLength = calculateWinLength(Array.from(keno), numbers);
  
    const probability = control[riskKey].find((e) => Number(e.winLength) === Number(winLength)).probability;

    const flag = Math.random();
    const setting = await Setting.findOne({});
    const settingMode = Number(mode) === 0 ? setting.easyKenoModeLimit : Number(mode) === 1 ? setting.normalKenoModeLimit : setting.hardKenoModeLimit;
    
    if(flag > probability * settingMode / 100) {
        return generateKenoNumbers(type, numbers, Number(mode));
    }

    return Array.from(keno);
}

const calculateWinLength = (arr1, arr2) => {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item)).length;
};

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const RISK_TYPE_TO_KEY = {
    0: 'low',
    1: 'classic',
    2: 'medium',
    3: 'high',
};

const normalizeRiskKey = (type) => {
    if (typeof type === 'string') {
        const k = type.toLowerCase();
        if (['low', 'classic', 'medium', 'high'].includes(k)) return k;
    }
    const n = Number(type);
    return RISK_TYPE_TO_KEY[Number.isFinite(n) ? n : 1] ?? 'classic';
};

const getMultiplierFromKenoControl = (controlDoc, riskKey, winLength) => {
    if (!controlDoc) return null;
    const tier = controlDoc[riskKey];
    if (!Array.isArray(tier)) return null;
    const entry = tier.find((e) => Number(e.winLength) === Number(winLength));
    if (!entry) return 0;
    return toNumberOrZero(entry.multiplier);
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
                cardGameMode: 1,
                avatar: 1,
                altas: 1,
                membership: 1,
                notification: { $slice: -20 },
                kenoHistory: { $slice: -20 },
            }
        ).lean();
        if (!user) return res.status(404).json({ error: "User not found" });
        
        const { amount, numbers, type } = req.body;
        const numAmount = toNumberOrZero(amount);
        if (numAmount <= 0) {
            return res.status(400).json({ error: "Invalid keno bet amount" });
        }
        if (numAmount > toNumberOrZero(user.balance)) {
            return res.status(400).json({ error: "You don't have enough balance to bet" });
        }
        if (!Array.isArray(numbers) || numbers.length < 1 || numbers.length > 10) {
            return res.status(400).json({ error: "Pick between 1 and 10 numbers" });
        }

        const keno = await generateKenoNumbers(type, numbers, req.user.kenoMode);

        const winLength = calculateWinLength(keno, numbers);

        const riskKey = normalizeRiskKey(type);
        const control = await KenoControl.findOne({ numbersLength: numbers.length }).lean();
        if (!control) {
            return res.status(400).json({ error: "Keno payout not configured for this pick count" });
        }
        const multi = getMultiplierFromKenoControl(control, riskKey, winLength);
        if (multi === null) {
            return res.status(400).json({ error: "Invalid keno risk configuration" });
        }
        
        const lastHistory =
        user.kenoHistory?.length > 0
            ? user.kenoHistory[user.kenoHistory.length - 1]
            : { totalBet: 0, totalWin: 0, kenoBalance: 0 };
        
        const riskTypeNum = [0, 1, 2, 3].includes(Number(type)) ? Number(type) : 1;

        const betEntry = {
            bet: numAmount,
            type: riskTypeNum,
            numbersLength: numbers.length,
            winLength: winLength,
            win: numAmount * multi,
            totalBet: toNumberOrZero(lastHistory.totalBet) + numAmount,
            totalWin: toNumberOrZero(lastHistory.totalWin) + numAmount * multi,
            kenoBalance: toNumberOrZero(lastHistory.kenoBalance) + numAmount * multi - numAmount,
            createAt: new Date(),
        };
        const nextBalance = toNumberOrZero(user.balance) + numAmount * multi - numAmount;
        const updateResult = await User.updateOne(
            { userId, balance: { $gte: numAmount } },
            {
                $inc: {
                    balance: numAmount * multi - numAmount,
                    totalBet: numAmount,
                    refreshBet: numAmount,
                    lotterybet: numAmount,
                },
                $push: {
                    kenoHistory: betEntry,
                },
            }
        );
        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "Keno bet conflict" });
        }
        const data = {
            keno,
            win: numAmount * multi,
        }
        
        const response = res.json({
            message: "",
            data,
            user: buildKenoCompactUser({
                ...user,
                balance: nextBalance,
                totalBet: toNumberOrZero(user.totalBet) + numAmount,
                refreshBet: toNumberOrZero(user.refreshBet) + numAmount,
                lotterybet: toNumberOrZero(user.lotterybet) + numAmount,
                kenoHistory: [...(user.kenoHistory ?? []), betEntry].slice(-20),
            }),
        });

        Promise.resolve()
            .then(() =>
                createKenoViewEntry({
                    userId,
                    bet: numAmount,
                    type: riskTypeNum,
                    numbersLength: numbers.length,
                    winLength: winLength,
                    win: numAmount * multi,
                    time: new Date(),
                })
            )
            .then(() => applyKenoModeByUserId(userId, toNumberOrZero(lastHistory.totalBet) + numAmount, toNumberOrZero(lastHistory.kenoBalance) + numAmount * multi - numAmount))
            .then(() => scheduleCreditAndBroadcast(req.app))
            .catch((err) => {
                console.error("keno bet side-effect error:", err);
            });

        return response;
    }
    catch (err) {
        console.log("Error in bet:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

export const getKenoHistory = async (req, res) => {
    try {
        const views = await KenoView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichKenoViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const getLastKenoView = async () => {
    const last = await KenoView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createKenoViewEntry = async ({
    userId,
    bet,
    type,
    numbersLength,
    winLength,
    win,
    time,
}) => {
    const last = await getLastKenoView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const kenoView = new KenoView({
        userId,
        bet: numBet,
        win: numWin,
        type: type,
        numbersLength: numbersLength,
        winLength: winLength,
        totalBet,
        totalWin,
        kenoBalance: totalWin - totalBet,
        isUser: 1,
        time: time,
    });

    await kenoView.save();
    return kenoView;
};

export const getKenoControls = async (req, res) => {
    try {
        const controls = await KenoControl.find().lean();
        return res.status(200).json({ data: controls });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await KenoView.find().sort({ time: -1 }).limit(12).lean();
        const data = await enrichKenoViewsWithUser(views);
        setTimeout(() => {
            ably.channels.get("kenoGame").publish("kenoUpdate", { updatedData: data }).catch((err) => {
                console.error("❌ [kenoController] Ably publish error:", err);
            });
        }, 2000);
    }
}

async function applyKenoModeByUserId(userId, totalBet, kenoBalance) {
    const limit =
        (await KenoLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
        
    if (limit.limitHard != null && kenoBalance > limit.limitHard) {
        await User.updateOne({ userId }, { $set: { kenoMode: 2 } });
    } else if (limit.limitNormal != null && kenoBalance < limit.limitNormal) {
        await User.updateOne({ userId }, { $set: { kenoMode: 1 } });
    }
}


async function enrichKenoViewsWithUser(kenoViews) {
    if (!Array.isArray(kenoViews) || kenoViews.length === 0) return [];

    const userIds = [...new Set(kenoViews.map((item) => item.userId).filter(Boolean))];
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, avatar: 1, altas: 1, membership: 1 }
    ).lean();

    const userMap = new Map(users.map((u) => [u.userId, u]));

    return kenoViews.map((item) => {
        const obj = { ...item };
        delete obj.isUser;
        delete obj.totalBet;
        delete obj.totalWin;
        delete obj.kenoBalance;

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
