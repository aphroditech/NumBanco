import User from "../models/User.js";
import RocketSettings from "../models/rocketShot/RocketSettings.js";
import RocketHistory from "../models/rocketShot/RocketHistory.js";
import RocketResult from "../models/rocketShot/RocketResult.js";
import CalendarRocket from "../models/rocketShot/CalendarRocket.js";

let rocketSettingsCache = null;
let rocketSettingsCacheAt = 0;
const ROCKET_SETTINGS_CACHE_MS = 5000;

async function getRocketSettingsCached() {
    const now = Date.now();
    if (rocketSettingsCache && now - rocketSettingsCacheAt < ROCKET_SETTINGS_CACHE_MS) {
        return rocketSettingsCache;
    }
    const settings = await RocketSettings.findOne().lean();
    rocketSettingsCache = settings;
    rocketSettingsCacheAt = now;
    return settings;
}

export const bet = async (req, res) => {
    try {
        const { bet, level } = req.body;
        const betAmount = Number(bet);
        if (!Number.isFinite(betAmount) || betAmount <= 0) {
            return res.status(400).json({ message: "Invalid bet amount" });
        }

        const [user, rocketSettings] = await Promise.all([
            User.findById(req.user._id)
                .select("balance rocketAmount rocketWinAmount rocketMode")
                .lean(),
            getRocketSettingsCached()
        ]);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!rocketSettings) {
            return res.status(404).json({ error: "Rocket settings not found" });
        }

        if (betAmount > user.balance) {
            return res.status(400).json({message: "You don't have engough money to fire."})
        }

        const normalToHard = checkNormalToHard(user.rocketAmount, user.rocketWinAmount, rocketSettings.limitNormalToHard);
        const hardToNormal = checkHardToNormal(user.rocketAmount, user.rocketWinAmount, rocketSettings.limitHardToNormal);

        let nextMode = user.rocketMode;
        // mode check and change
        if (user.rocketMode === 0 && normalToHard) {
            nextMode = 1;
        } else if (user.rocketMode === 1 && hardToNormal) {
            nextMode = 0;
        }

        // get multiplier via mode
        let multiplier = getMultiplier(nextMode, rocketSettings.normalMultiple, rocketSettings.hardMultiple);
        
        if (level === "normal") {
            multiplier *= 1100;
            multiplier /= 1000;  
        } else if (level === "hard") {
            multiplier *= 1200;
            multiplier /= 1000;
        }

        // single DB write for this endpoint (instead of multiple save() calls)
        await User.updateOne(
            { _id: req.user._id },
            {
                $set: { rocketMode: nextMode },
                $inc: {
                    balance: -betAmount,
                    totalBet: betAmount,
                    lotterybet: betAmount,
                    refreshBet: betAmount,
                    rocketAmount: betAmount,
                },
                $push: {
                    totalhistory: {
                        amount: -betAmount,
                        date: new Date(),
                        type: "Lose",
                        game: "Rocket",
                    },
                },
            }
        );

        return res.json({ balance: -betAmount, multiplier: multiplier });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

function getMultiplier(mode, normalMultiple, hardMultiple) {
    const defaultNormalMultipliers = [{ number: 0.5, probability: 5 }];
    const defaultHardMultipliers = [{ number: 1, probability: 5 }];
    const candidate = mode === 0 ? normalMultiple : hardMultiple;
    const fallback = mode === 0 ? defaultNormalMultipliers : defaultHardMultipliers;
    const multipliers = Array.isArray(candidate) && candidate.length > 0 ? candidate : fallback;
    const normalizedMultipliers = multipliers.filter(
        (m) => Number.isFinite(Number(m?.number)) && Number.isFinite(Number(m?.probability)) && Number(m.probability) > 0
    );
    if (normalizedMultipliers.length === 0) {
        return fallback[0].number;
    }
    const totalWeight = normalizedMultipliers.reduce((sum, m) => sum + Number(m.probability), 0);
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        return normalizedMultipliers[0].number;
    }
  
    let random = Math.random() * totalWeight;
  
    for (const m of normalizedMultipliers) {
        const probability = Number(m.probability);
        const number = Number(m.number);
        if (random < probability) {
            return number;
        }
        random -= probability;
    }
    return Number(normalizedMultipliers[normalizedMultipliers.length - 1].number);
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
                            type: "Win",
                            game: "Rocket Shot",
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