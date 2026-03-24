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
                        type: "Rocket Shot",
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

    const multipliers = mode === 0 ? normalMultiple : hardMultiple;

    const totalWeight = multipliers.reduce((sum, m) => sum + m.probability, 0);
  
    let random = Math.random() * totalWeight;
  
    for (let m of multipliers) {
        if (random < m.probability) {
            return m.number;
        }
        random -= m.probability;
    }
    return 0;
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
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const winAmount = isWin ? betAmount * multiplier : 0;
        if (isWin) {
            user.balance += winAmount;
            user.totalEarn += winAmount;
            user.rocketWinAmount += winAmount;
            user.totalhistory.push({
                amount: winAmount,
                date: new Date(),
                type: "Win Rocket",
            });
        }

        await user.save();

        // save result to rocket history
        const rocketHistory = await RocketHistory.findOne({ user: user._id });
        if (!rocketHistory) {
            const newRocketHistory = new RocketHistory({
                user: user._id,
                history: [{
                    isWin: isWin,
                    betAmount: betAmount,
                    multiplier: multiplier,
                    winAmount: winAmount,
                    level: level,
                    date: new Date(),
                }]
            });
            await newRocketHistory.save();
        } else {
            rocketHistory.history.push({
                isWin: isWin,
                betAmount: betAmount,
                multiplier: multiplier,
                winAmount: winAmount,
                level: level,
                date: new Date(),
            });
            await rocketHistory.save();
        }
        await CalendarRocket.create({
            userName: user.altas,
            isWin: isWin,
            betAmount: betAmount,
            winAmount: winAmount,
            date: new Date()
        })

        // save bet result
        const data = {
            userName: user.altas,
            avatar: user.avatar,
            isWin: isWin,   
            multiplier: isWin ? multiplier : 0,
            bet: betAmount,
            win: winAmount,
            date: new Date()
        };
        await RocketResult.create(data);

        // send ably for real view
        const ably = req.app.locals.ably;
        if (ably) {
            const channelName = "rocketResult";
            const channel = ably.channels.get(channelName);

            channel.publish("ROCKET_RESULT", data);
        }
        const userRocketHistory = await RocketHistory.findOne({ user: user._id });
        
        if(isWin) {
            return  res.json({ balance: winAmount, rocketHistory: userRocketHistory.history } );
        } else {
            return res.json({ balance: 0, rocketHistory: userRocketHistory.history } );
        }
        
    } catch (error) {
        console.error(error);
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