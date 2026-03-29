
import User from "../models/User.js";

import wheelSettings from "../models/Wheel/wheelSettings.js";
import WheelHistoryModel from "../models/Wheel/wheelHistory.js";
import CalendarWheel from "../models/Wheel/CalendarWheel.js";
import WheelResult from "../models/Wheel/wheelResult.js";

const LEVEL_KEYS = new Set(["low", "medium", "hard"]);

/** WheelSettings change rarely; cache lean doc to skip a DB round-trip per bet. */
let _wheelSettingsCache = null;
let _wheelSettingsCacheAt = 0;
const WHEEL_SETTINGS_TTL_MS = 60_000;

async function getWheelSettingsLean() {
    const now = Date.now();
    if (_wheelSettingsCache && now - _wheelSettingsCacheAt < WHEEL_SETTINGS_TTL_MS) {
        return _wheelSettingsCache;
    }
    const doc = await wheelSettings.findOne({}).select("low medium hard").lean();
    if (doc) {
        _wheelSettingsCache = doc;
        _wheelSettingsCacheAt = now;
    }
    return doc;
}

function multEq(a, b) {
    return Math.abs(Number(a) - Number(b)) < 1e-9;
}

export const betWheel = async (req, res) => {
    try {
        const { betAmount, level } = req.body;

        if (betAmount == null || !level) {
            return res.status(400).json({ message: "Bet amount and level are required" });
        }
        if (!LEVEL_KEYS.has(level)) {
            return res.status(400).json({ message: "Invalid wheel level" });
        }

        const bet = Number(betAmount);
        if (!Number.isFinite(bet) || bet <= 0) {
            return res.status(400).json({ message: "Bet amount must be greater than 0 and less than your balance" });
        }

        const [settings, historyDoc] = await Promise.all([
            getWheelSettingsLean(),
            WheelHistoryModel.findOne({ user: req.user._id }).select("history").lean(),
        ]);

        if (!settings) {
            return res.status(503).json({ message: "Wheel settings not configured" });
        }

        const levelSettings = settings[level];
        if (!Array.isArray(levelSettings) || levelSettings.length === 0) {
            return res.status(503).json({ message: "Wheel level is not configured" });
        }

        const historyList = Array.isArray(historyDoc?.history) ? historyDoc.history : [];

        const historyEntry = {
            amount: -bet,
            date: new Date(),
            game: "Wheel",
            type: "Lose",
        };

        const updated = await User.findOneAndUpdate(
            { _id: req.user._id, balance: { $gte: bet } },
            {
                $inc: {
                    balance: -bet,
                    totalBet: bet,
                    refreshBet: bet,
                    lotterybet: bet,
                    wheelAmount: bet,
                },
                $push: { totalhistory: historyEntry },
            },
            { new: true, select: "balance" },
        );

        if (!updated) {
            return res.status(400).json({ message: "Bet amount must be greater than 0 and less than your balance" });
        }

        const multiplier = getMultiplier(levelSettings);
        const isValid = checkIsValid(multiplier, levelSettings, historyList, level);
        const result = isValid ? multiplier : 0;

        console.log("wheel result", result);
        return res.json({ result, balance: -bet });
    } catch (error) {
        console.error("betWheel:", error);
        return res.status(500).json({ message: error.message });
    }
};

function getMultiplier(settings) {
    const totalWeight = settings.reduce((sum, m) => sum + (Number(m.probability) || 0), 0);
    if (totalWeight <= 0 || !settings.length) {
        return 0;
    }

    let random = Math.random() * totalWeight;

    for (const m of settings) {
        const p = Number(m.probability) || 0;
        if (random < p) {
            return Number(m.multiplier) || 0;
        }
        random -= p;
    }

    const last = settings[settings.length - 1];
    return Number(last?.multiplier) || 0;
}

function checkIsValid(multiplier, levelSettings, history, levelKey) {
    if (!history?.length) {
        return true;
    }

    const tempNumbers = levelSettings.find((m) => multEq(m.multiplier, multiplier));
    if (!tempNumbers) {
        return true;
    }

    const totalNumber = Math.max(0, Number(tempNumbers.totalNumber) || 0);
    const canWinNumber = Number(tempNumbers.canWinNumber) || 0;

    const totalNumberHistory = history.filter(
        (h) => h.level === levelKey && multEq(h.multiplier, multiplier),
    ).length;

    const recentCount =
        totalNumber > 0 && totalNumberHistory ? totalNumberHistory % totalNumber : 0;
    const lastN =
        recentCount > 0
            ? history.slice(-recentCount)
            : history.slice(-totalNumberHistory);

    const wins = lastN.filter((h) => h.isWin === true).length;
    return canWinNumber >= wins;
}

/**
 * Client calls after the wheel animation stops. Credits payout from stake × multiplier when multiplier > 0.
 */
export const completeWheelSpin = async (req, res) => {
    try {
        const { multiplier, betAmount, level } = req.body;

        const mult = Number(multiplier);
        const bet = Number(betAmount);
        if (!Number.isFinite(mult) || mult < 0) {
            return res.status(400).json({ message: "Invalid multiplier" });
        }
        if (!Number.isFinite(bet) || bet <= 0) {
            return res.status(400).json({ message: "betAmount is required and must be positive" });
        }

        const winAmount =
            mult > 0 ? Math.round(bet * mult * 100) / 100 : 0;
        const isWin = winAmount > 0;

        const updateOps = {};
        if (winAmount > 0) {
            updateOps.$inc = {
                balance: winAmount,
                wheelWinAmount: winAmount,
                totalEarn: winAmount,
            };
            updateOps.$push = {
                totalhistory: {
                    amount: winAmount,
                    date: new Date(),
                    type: "Win",
                    game: "Wheel",
                },
            };
        }

        const updated =
            Object.keys(updateOps).length > 0
                ? await User.findOneAndUpdate({ _id: req.user._id }, updateOps, {
                      new: true,
                      select: "altas avatar balance wheelWinAmount totalEarn",
                  })
                : await User.findById(req.user._id).select(
                      "altas avatar balance wheelWinAmount totalEarn",
                  );

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        const calendarWheel = new CalendarWheel({
            userName: updated.altas,
            isWin,
            betAmount: bet,
            winAmount,
            date: new Date(),
        });
        await calendarWheel.save();

        const wheelResult = new WheelResult({
            userName: updated.altas,
            avatar: updated.avatar,
            isWin,
            level: level || "low",
            betAmount: bet,
            multiplier: mult,
            winAmount,
            date: new Date(),
        });
        await wheelResult.save();

        const ably = req.app.locals.ably;
        if (ably) {
            const channel = ably.channels.get("wheelResult");
            channel.publish("WHEEL_RESULT", {
                userName: updated.altas,
                avatar: updated.avatar,
                isWin,
                level: level || "low",
                betAmount: bet,
                multiplier: mult,
                winAmount,
                date: new Date(),
            });
        }

        const histDoc = await WheelHistoryModel.findOne({ user: req.user._id });
        const historyEntry = {
            isWin,
            betAmount: bet,
            level: level || "low",
            multiplier: mult,
            winAmount,
            date: new Date(),
        };
        if (histDoc) {
            histDoc.history = histDoc.history || [];
            histDoc.history.push(historyEntry);
            await histDoc.save();
        } else {
            await WheelHistoryModel.create({
                user: req.user._id,
                history: [historyEntry],
            });
        }

        const histories = await WheelHistoryModel.findOne({ user: req.user._id });
        return res.status(200).json({
            message: "Wheel spin complete",
            balance: winAmount,
            history: histories?.history || [],
        });
    } catch (error) {
        console.error("completeWheelSpin:", error);
        return res.status(500).json({ message: error.message });
    }
};


export const getWheelResult = async (req, res) => {
    try {
        const results = await WheelResult.find({}).sort({ date: -1 }).limit(15);
        return res.status(200).json(results);
    } catch (error) {
        console.error("getWheelResult:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const getWheelHistory = async (req, res) => {
    try {
        const history = await WheelHistoryModel.findOne({ user: req.user._id });
        return res.status(200).json({ history: history?.history || [] });
    } catch (error) {
        console.error("getWheelHistory:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};