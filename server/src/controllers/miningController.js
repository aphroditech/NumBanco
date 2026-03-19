import MiningSettings from "../models/MiningSettings.js";
import User from "../models/User.js";
import MiningHistory from "../models/MiningHistory.js";
import MiningResult from "../models/MiningResult.js";

import CalendarMining from "../models/CalendarMining.js";

export const checkCanWin = async (req, res) => {
    try {
        const settings = await MiningSettings.findOne();
        const user = await User.findById(req.user._id);

        const { betAmt, turn } = req.body;

        if (!settings) {
            return res.status(404).json({ error: "Mining settings not found" });
        }
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.balance -= betAmt;
        user.totalBet += betAmt;
        user.refreshBet += betAmt;
        user.lotterybet += betAmt;
        user.miningAmount += betAmt;

        if (user.miningMode === 0 && user.miningWinAmount > settings.limitNormalToHard * user.miningAmount) {
            user.miningMode = 1;
        } else if (user.miningMode === 1 && user.miningWinAmount < settings.limitHardToNormal * user.miningAmount) {
            user.miningMode = 0;
        }

        await user.save();

        const M1uXj3sZpU = await isWinLimitReached( user._id, betAmt, turn);

        return res.json({ user, M1uXj3sZpU });
    }
    catch (error) {
        console.error("Error in checkCanWin:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function isWinLimitReached(user, betAmt, turn) {
    const miningHistory = await MiningHistory.findOne({ user: user });
    const settings = await MiningSettings.findOne({});

    const turns = "Turns" + turn;

    const tempNumbers = settings[turns]?.find(
        r => betAmt >= r.min && betAmt < r.max
    );

    if (!tempNumbers) return false;

    const { min, max, totalNumber, canWinNumber } = tempNumbers;

    const filtered = miningHistory?.history?.filter(
        h => h.betAmount >= min && h.betAmount < max
    );

    const recentCount = filtered.length % totalNumber;

    const lastN = recentCount > 0
        ? filtered.slice(-recentCount)
        : filtered.slice(-totalNumber);

    const wins = lastN.filter(h => h.isWin === true).length;
    // console.log("wins", wins, "canWinNumber", canWinNumber);
    return canWinNumber >= wins;
}

export const resultGameMining = async (req, res) => {
    try {
        const { betAmt, turn, isWin } = req.body;
        const user = await User.findById(req.user._id);
        const miningHistory = await MiningHistory.findOne({ user: req.user._id });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const profit = isWin ? Number((betAmt * (16/turn)).toFixed(2)) : 0;
        if ( isWin === true ) {
            user.balance += profit;
            user.totalEarn = (1000 * user.totalEarn + 1000 * profit) / 1000;
            user.miningWinAmount = (1000 * user.miningWinAmount + 1000 * profit) / 1000;
            user.totalhistory.push({
                amount: profit,
                date: new Date(),
                type: "Mining"
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
                turn: turn,
                win: profit,
                date: new Date()
            };
            channel.publish("MINING_RESULT", data);
        }

        if (miningHistory) {
            miningHistory.history.push({
                isWin: isWin,
                turns: turn,
                betAmount: betAmt,
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
                    winAmount: profit,
                    date: new Date()
                }]
            });
            await newMiningHistory.save();
        }
        const histories = await MiningHistory.findOne({ user: req.user._id });
        return res.json({ user, histories: histories.history });
    }
    catch (error) {
        console.error("Error in resultGameMining:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMiningHistory = async (req, res) => {
    try {
        const histories = await MiningHistory.findOne({ user: req.user._id });
        return res.json({ histories: histories.history });
    }
    catch (error) {
        console.error("Error in getMiningHistory:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMiningResult = async (req, res) => {
    try {
        const results = await MiningResult.find({}).sort({ date: -1 }).limit(12);
        return res.status(200).json(results);
    }
    catch (error) {
        console.error("Error in getMiningResult:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}