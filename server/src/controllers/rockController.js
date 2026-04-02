import User from "../models/User.js";

import RockSettings from "../models/rock/rockSettings.js";
import RockHistory from "../models/rock/rockHistory.js";
import RockResult from "../models/rock/rockResult.js";
import CalendarRock from "../models/rock/CalendarRock.js";

export const bet = async (req, res) => {
    try {
        const { betAmount, multiplier, isStart } = req.body;
        const multi = parseFloat(multiplier.toFixed(2));
        const bet = parseFloat(betAmount);
        if (!Number.isFinite(bet) || bet <= 0) {
            return res.status(400).json({ message: "Invalid bet amount" });
        }

        const rockSettings = await RockSettings.findOne();
        if (!rockSettings) {
            return res.status(400).json({ message: "Rock settings not found" });
        }

        const RTP = rockSettings.multiplier.find(m => bet >= m.minAmount && bet <= m.maxAmount).RTPPercentage;

        if (isStart) {
            await User.findOneAndUpdate(
                { _id: req.user._id },
                {
                    $inc: {
                        balance: -bet,
                        totalBet: bet,
                        refreshBet: bet,
                        lotterybet: bet,
                    },
                    $push: {
                        totalhistory: {
                            amount: -bet,
                            date: new Date(),
                            type: "Rock",
                        },
                    },
                },
                { new: true }
            );
        }
        const isWin = getIsWin(RTP, multi);

        console.log("Win Status:", isWin);
        return res.json({
            isWin,
            balance: isStart ? -bet : 0,
        });

    } catch (error) {
        console.error("❌ Error betting on rock:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

function getIsWin(RTP, multiplier) {
    if (multiplier > 4) return 0;
    const probability = Math.min(Math.max(RTP / multiplier, 0), 1);

    const settings = {
        win: probability / 2,
        draw: probability / 2,
        lose: 1 - probability,
    };

    const resultMap = {
        win: 2,
        draw: 1,
        lose: 0,
    };

    const entries = Object.entries(settings);
    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

    let random = Math.random() * totalWeight;

    for (const [key, weight] of entries) {
        random -= weight;
        if (random <= 0) {
            return resultMap[key];
        }
    }

    // fallback safety (very unlikely to trigger)
    return resultMap[entries[entries.length - 1][0]];
}

export const cashout = async (req, res) => {
    try {
        const { betAmount, multiplier } = req.body;
        const bet = parseFloat(betAmount);
        const multi = parseFloat(multiplier.toFixed(2));
        const isWin = true;

        const winAmount = bet * multi;
        if (!Number.isFinite(bet) || bet <= 0) {
            return res.status(400).json({ message: "Invalid bet amount" });
        }

        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user._id },
            {
                $inc: {
                    balance: winAmount,
                    totalBet: bet,
                    refreshBet: bet,
                    lotterybet: bet,
                },
                $push: {
                    totalhistory: {
                        amount: winAmount,
                        date: new Date(),
                        type: "Win",
                        game: "Rock",
                    },
                },
            },
            { new: true }
        );

        const rockHistory = await RockHistory.findOneAndUpdate(
            { user: req.user._id },
            { $push: { history: { isWin: isWin, betAmount: bet, winAmount: winAmount, multiplier: multi, date: new Date() } } },
            { new: true, upsert: true, select: "history" },
        );

        const rockResult = new RockResult({
            userName: req.user.altas,
            avatar: req.user.avatar,
            isWin: isWin,
            multiplier: multi,
            betAmount: bet,
            winAmount: winAmount || 0,
            date: new Date(),
        });
        await rockResult.save();

        const calendarRock = new CalendarRock({
            userName: req.user.altas,
            isWin: isWin,
            betAmount: bet,
            winAmount: winAmount || 0,
            date: new Date(),
        });
        await calendarRock.save();

        const ably = req.app?.locals?.ably;
        if (ably) {
            try {
                const channel = ably.channels.get("rockResult");
                await channel.publish("ROCK_RESULT", rockResult);
            } catch (ablyErr) {
                console.error("❌ Error publishing rock result to Ably:", ablyErr);
            }
        }

        return res.json({
            balance: winAmount,
            history: rockHistory?.history || [],
        })
    } catch (error) {
        console.error("❌ Error cashing out rock:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export const getRockResults = async (req, res) => {
    try {
        const results = await RockResult.find({}).sort({ date: -1 }).limit(13).lean();
        return res.status(200).json({ results });
    } catch (error) {
        console.error('❌ Error getting Rock results:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getRockHistory = async (req, res) => {
    try {
        const doc = await RockHistory.findOne({ user: req.user._id }).select("history").lean();
        return res.status(200).json({ history: Array.isArray(doc?.history) ? doc.history : [] });
    } catch (error) {
        console.error('❌ Error getting Rock history:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const bang = async (req, res) => {
    try {
        const { betAmount, multiplier } = req.body;
        const bet = parseFloat(betAmount);
        const multi = parseFloat(multiplier.toFixed(2));
        const isWin = false;

        const rockHistory = await RockHistory.findOneAndUpdate(
            { user: req.user._id },
            { $push: { history: { isWin: isWin, betAmount: bet, winAmount: 0, multiplier: multi, date: new Date() } } },
            { new: true, upsert: true, select: "history" },
        );


        const rockeCalendar = new CalendarRock({
            userName: req.user.altas,
            isWin: isWin,
            betAmount: bet,
            winAmount: 0,
            date: new Date(),
        });
        await rockeCalendar.save();

        const rockResult = new RockResult({
            userName: req.user.altas,
            avatar: req.user.avatar,
            isWin: isWin,
            multiplier: multi,
            betAmount: bet,
            winAmount: 0,
            date: new Date(),
        });
        await rockResult.save();

        const ably = req.app?.locals?.ably;
        if (ably) {
            try {
                const channel = ably.channels.get("rockResult");
                await channel.publish("ROCK_RESULT", rockResult);
            } catch (ablyErr) {
                console.error("❌ Error publishing rock result to Ably:", ablyErr);
            }
        }

        return res.status(200).json({ history: rockHistory?.history || [] });
    } catch (error) {
        console.error("❌ Error banging rock:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}