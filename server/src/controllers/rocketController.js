import User from "../models/User.js";
import RocketSettings from "../models/rocketShot/RocketSettings.js";
import RocketHistory from "../models/rocketShot/RocketHistory.js";
import RocketResult from "../models/rocketShot/RocketResult.js";
import CalendarRocket from "../models/rocketShot/CalendarRocket.js";

export const bet = async (req, res) => {
    try {
        const { bet, level } = req.body;
        const betNum = Number(bet) || 0;
        const [baseUser, rocketSettings] = await Promise.all([
            User.findById(req.user._id).select("balance rocketAmount rocketWinAmount rocketMode"),
            RocketSettings.findOne().lean()
        ]);

        const user = baseUser;
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!rocketSettings) {
            return res.status(404).json({ error: "Rocket settings not found" });
        }

        if (betNum <= 0) {
            return res.status(400).json({ message: "Invalid bet amount." });
        }

        if (betNum > user.balance) {
            return res.status(400).json({message: "You don't have engough money to fire."})
        }

        const normalToHard = checkNormalToHard(user.rocketAmount, user.rocketWinAmount, rocketSettings.limitNormalToHard);
        const hardToNormal = checkHardToNormal(user.rocketAmount, user.rocketWinAmount, rocketSettings.limitHardToNormal);
        // mode check and change
        let rocketMode = user.rocketMode;
        if (rocketMode === 0 && normalToHard) {
            rocketMode = 1;
        } else if (rocketMode === 1 && hardToNormal) {
            rocketMode = 0;
        }

        // get multiplier via mode
        let multiplier = getMultiplier(rocketMode, rocketSettings.normalMultiple, rocketSettings.hardMultiple);

        await User.updateOne(
            { _id: user._id },
            {
                $set: { rocketMode },
                $inc: {
                    balance: -betNum,
                    totalBet: betNum,
                    lotterybet: betNum,
                    refreshBet: betNum,
                    rocketAmount: betNum,
                },
                $push: {
                    totalhistory: {
                        amount: -betNum,
                        date: new Date(),
                        type: "Rocket Shot",
                    }
                }
            }
        );

        if (level === "normal") {
            multiplier *= 1100;
            multiplier /= 1000;
        } else if (level === "hard") {
            multiplier *= 1200;
            multiplier /= 1000;
        }
        return res.json({ balance: -betNum, multiplier: multiplier });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

function getMultiplier(mode, normalMultiple, hardMultiple) {
    const selected = mode === 0 ? normalMultiple : hardMultiple;
    const fallback = mode === 0
        ? [{ number: 0.5, probability: 1 }]
        : [{ number: 1, probability: 1 }];

    const multipliers = Array.isArray(selected) && selected.length > 0 ? selected : fallback;
    const normalized = multipliers
        .map((m) => ({
            number: Number(m?.number),
            probability: Number(m?.probability),
        }))
        .filter((m) => Number.isFinite(m.number) && m.number > 0 && Number.isFinite(m.probability) && m.probability > 0);

    // If settings were malformed, still return a safe non-zero multiplier.
    if (normalized.length === 0) {
        return fallback[0].number;
    }

    const totalWeight = normalized.reduce((sum, m) => sum + m.probability, 0);
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        return normalized[0].number;
    }

    let random = Math.random() * totalWeight;

    for (const m of normalized) {
        if (random < m.probability) {
            return m.number;
        }
        random -= m.probability;
    }
    return normalized[normalized.length - 1].number;
}

// check if the user should be in hard mode or normal mode Normal to Hard
function checkNormalToHard(rocketAmount, rocketWinAmount, limitNormalToHard) {
    if(rocketWinAmount > rocketAmount * limitNormalToHard) {
        return true;
    }
    return false;
}

// check if the user should be in normal mode or hard mode Hard to Normal
function checkHardToNormal(rocketAmount, rocketWinAmount, limitHardToNormal) {
    if(rocketWinAmount < rocketAmount * limitHardToNormal) {
        return true;
    }
    return false;
}

// identify win or lose
export const shotResult = async (req, res) => {
    try {
        const { isWin, betAmount, multiplier, level } = req.body;
        const numericBetAmount = Number(betAmount) || 0;
        const numericMultiplier = Number(multiplier) || 0;
        const user = await User.findById(req.user._id).select("altas avatar");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const winAmount = isWin ? numericBetAmount * numericMultiplier : 0;
        if (isWin) {
            await User.updateOne(
                { _id: user._id },
                {
                    $inc: {
                        balance: winAmount,
                        totalEarn: winAmount,
                        rocketWinAmount: winAmount,
                    },
                    $push: {
                        totalhistory: {
                            amount: winAmount,
                            date: new Date(),
                            type: "Win Rocket",
                        }
                    }
                }
            );
        }

        const historyEntry = {
            isWin: isWin,
            betAmount: numericBetAmount,
            multiplier: numericMultiplier,
            winAmount: winAmount,
            level: level,
            date: new Date(),
        };

        const userRocketHistory = await RocketHistory.findOneAndUpdate(
            { user: user._id },
            { $push: { history: historyEntry } },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                projection: { history: 1, _id: 0 }
            }
        ).lean();

        // save bet result data in background to keep response path fast
        const data = {
            userName: user.altas,
            avatar: user.avatar,
            isWin: isWin,
            multiplier: isWin ? numericMultiplier : 0,
            bet: numericBetAmount,
            win: winAmount,
            date: new Date()
        };

        res.json({
            balance: isWin ? winAmount : 0,
            rocketHistory: userRocketHistory?.history || []
        });

        // Fire-and-forget writes/publish that are not required for this request response.
        setImmediate(async () => {
            try {
                await Promise.all([
                    CalendarRocket.create({
                        userName: user.altas,
                        isWin: isWin,
                        betAmount: numericBetAmount,
                        winAmount: winAmount,
                        date: new Date()
                    }),
                    RocketResult.create(data),
                ]);

                const ably = req.app.locals.ably;
                if (ably) {
                    const channelName = "rocketResult";
                    const channel = ably.channels.get(channelName);
                    channel.publish("ROCKET_RESULT", data).catch((ablyErr) => {
                        console.error("Failed to publish ROCKET_RESULT:", ablyErr);
                    });
                }
            } catch (asyncError) {
                console.error("shotResult async post-processing error:", asyncError);
            }
        });
        return;
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export const getRocketResults = async (req, res) => {
    try {
        const rocketResults = await RocketResult.find({}).sort({ date: -1 }).limit(23);
        return res.json(rocketResults);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getRocketHistory = async (req, res) => {
    try {
        const rocketHistory = await RocketHistory.findOne({ user: req.user._id });
        return res.json({ rocketHistory: rocketHistory?.history || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}