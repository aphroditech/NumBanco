import MiningSettings from "../models/jackal/MiningSettings.js";
import User from "../models/User.js";
import MiningHistory from "../models/jackal/MiningHistory.js";
import MiningResult from "../models/jackal/MiningResult.js";

import CalendarMining from "../models/jackal/CalendarMining.js";

let miningSettingsCache = null;
let miningSettingsCacheAt = 0;
const MINING_SETTINGS_CACHE_MS = 5000;

async function getMiningSettingsCached() {
    const now = Date.now();
    if (miningSettingsCache && now - miningSettingsCacheAt < MINING_SETTINGS_CACHE_MS) {
        return miningSettingsCache;
    }
    const settings = await MiningSettings.findOne().lean();
    miningSettingsCache = settings;
    miningSettingsCacheAt = now;
    return settings;
}


export const checkCanWin = async (req, res) => {
    try {
        const { betAmt, turn } = req.body;
        const betAmount = Number(betAmt);
        const turnNum = Number(turn);

        if (!Number.isFinite(betAmount) || betAmount <= 0) {
            return res.status(400).json({ error: "Invalid bet amount" });
        }
        if (!Number.isInteger(turnNum) || turnNum < 1) {
            return res.status(400).json({ error: "Invalid turn" });
        }

        const [settings, user] = await Promise.all([
            getMiningSettingsCached(),
            User.findById(req.user._id)
                .select("balance totalBet refreshBet lotterybet miningAmount miningMode miningWinAmount")
                .lean(),
        ]);

        if (!settings) {
            return res.status(404).json({ error: "Mining settings not found" });
        }
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (betAmount > user.balance) {
            return res.status(400).json({ error: "You don't have enough balance" });
        }

        let nextMode = user.miningMode;
        const nextMiningAmount = (user.miningAmount || 0) + betAmount;
        if (user.miningMode === 0 && (user.miningWinAmount || 0) > settings.limitNormalToHard * nextMiningAmount) {
            nextMode = 1;
        } else if (user.miningMode === 1 && (user.miningWinAmount || 0) < settings.limitHardToNormal * nextMiningAmount) {
            nextMode = 0;
        }

        await User.updateOne(
            { _id: req.user._id },
            {
                $set: { miningMode: nextMode },
                $inc: {
                    balance: -betAmount,
                    totalBet: betAmount,
                    refreshBet: betAmount,
                    lotterybet: betAmount,
                    miningAmount: betAmount,
                },
                $push: {
                    totalhistory: {
                        amount: -betAmount,
                        date: new Date(),
                        type: "Lose",
                        game: "Jackal",
                    },
                },
            }
        );

        const M1uXj3sZpU = await isWinLimitReached(req.user._id, betAmount, turnNum, settings);

        return res.json({ balance: -betAmount, M1uXj3sZpU });
    }
    catch (error) {
        console.error("Error in checkCanWin:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function isWinLimitReached(user, betAmt, turn, settings) {
    const miningHistory = await MiningHistory.findOne({ user })
        .select("history.betAmount history.isWin")
        .lean();

    const turns = "Turns" + turn;

    const tempNumbers = settings[turns]?.find(
        r => betAmt >= r.min && betAmt < r.max
    );

    if (!tempNumbers) return false;

    const { min, max, totalNumber, canWinNumber } = tempNumbers;

    const filtered = miningHistory?.history?.filter(
        h => h.betAmount >= min && h.betAmount < max
    );

    const recentCount = filtered?.length ? filtered.length % totalNumber : 0;

    const lastN = recentCount > 0
        ? filtered?.slice(-recentCount)
        : filtered?.slice(-totalNumber);

    const wins = lastN?.filter(h => h.isWin === true)?.length || 0;
    // console.log("wins", wins, "canWinNumber", canWinNumber);
    return canWinNumber >= wins;
}

export const resultGameMining = async (req, res) => {
    try {
        const { betAmt, turn, isWin, multiplier } = req.body;
        const user = await User.findById(req.user._id);
        const miningHistory = await MiningHistory.findOne({ user: req.user._id });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        let profit = 0;

        if (isWin) {
            profit = multiplier * betAmt;
        }
        if ( isWin === true ) {
            user.balance += profit;
            user.totalEarn += profit;
            user.miningWinAmount += profit;
            user.totalhistory?.push({
                amount: profit,
                date: new Date(),
                type: "Win",
                game: "Jackal",
            });
            await user.save();
        }

        const calendarMining = new CalendarMining({
            userName: user.altas,
            isWin: isWin,
            betAmount: betAmt,
            winAmount: profit,
            date: Date.now(),
        });
        await calendarMining.save();
        const miningResult = new MiningResult({
            userName: user.altas,
            avatar: user.avatar,
            bet: betAmt,
            isWin: isWin,
            multiplier: isWin ? multiplier : 0,
            turn: turn,
            win: profit,
            date: new Date()
        });
        await miningResult.save();

        const ably = req.app.locals.ably;
        if (ably) {
            const channelName = "miningResult";
            const channel = ably.channels.get(channelName);

            const data = {
                userName: user.altas,
                avatar: user.avatar,
                isWin: isWin,
                bet: betAmt,
                multiplier: isWin ? multiplier : 0,
                turn: turn,
                win: profit,
                date: new Date()
            };
            channel.publish("MINING_RESULT", data);
        }

        if (miningHistory) {
            miningHistory.history?.push({
                isWin: isWin,
                turns: turn,
                betAmount: betAmt,
                multiplier: multiplier,
                winAmount: profit,
                date: new Date()
            });
            await miningHistory.save();
        } else {
            const newMiningHistory = new MiningHistory({
                user: req.user._id,
                history: [{
                    isWin: isWin,
                    turns: turn,
                    betAmount: betAmt,
                    multiplier: multiplier,
                    winAmount: profit,
                    date: new Date()
                }]
            });
            await newMiningHistory.save();
        }
        const histories = await MiningHistory.findOne({ user: req.user._id });
        return res.json({ balance: profit, histories: histories?.history || [] });
    }
    catch (error) {
        console.error("Error in resultGameMining:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMiningHistory = async (req, res) => {
    try {
        const histories = await MiningHistory.findOne({ user: req.user._id });
        return res.json({ histories: histories?.history || [] });
    }
    catch (error) {
        console.error("Error in getMiningHistory:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMiningResult = async (req, res) => {
    try {
        const results = await MiningResult.find({}).sort({ date: -1 }).limit(10);
        return res.status(200).json(results);
    }
    catch (error) {
        console.error("Error in getMiningResult:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}