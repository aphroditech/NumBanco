import User from "../models/User.js";
import RocketSettings from "../models/rocketShot/RocketSettings.js";
import RocketHistory from "../models/rocketShot/RocketHistory.js";
import RocketResult from "../models/rocketShot/RocketResult.js";
import CalendarRocket from "../models/rocketShot/CalendarRocket.js";

export const bet = async (req, res) => {
    try {
        const { bet, level } = req.body;
        const [user, rocketSettings] = await Promise.all([
            User.findById(req.user._id),
            RocketSettings.findOne()
        ]);
        if (!rocketSettings) {
            return res.status(404).json({ error: "Rocket settings not found" });
        }

        if(bet > user.balance ) {
            return res.status(400).json({message: "You don't have engough money to fire."})
        }
        const normalToHard = await checkNormalToHard(user.rocketAmount, user.rocketWinAmount, rocketSettings.limitNormalToHard);
        const hardToNormal = await checkHardToNormal(user.rocketAmount, user.rocketWinAmount, rocketSettings.limitHardToNormal);
        // mode check and change
        if(user.rocketMode === 0 && normalToHard) {
            user.rocketMode = 1;
        } else if(user.rocketMode === 1 && hardToNormal) {
            user.rocketMode = 0;
        }
        await user.save();

        // get multiplier via mode
        let multiplier = await getMultiplier(user.rocketMode, rocketSettings.normalMultiple, rocketSettings.hardMultiple);
        
        // add neccesary fields to user
        user.balance -= bet;
        user.totalBet += bet;
        user.lotterybet += bet;
        user.refreshBet += bet;
        user.rocketAmount += bet;
        user.totalhistory.push({
            amount: -bet,
            date: new Date(),
            type: "Rocket Shot",
        });
        await user.save();
        if(level === "normal") {
            multiplier *= 1100;
            multiplier /= 1000;  
        } else if(level === "hard") {
            multiplier *= 1200;
            multiplier /= 1000;  
        }
        return res.json({ balance: -bet, multiplier: multiplier });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

async function getMultiplier(mode, normalMultiple, hardMultiple) {

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
async function checkNormalToHard(rocketAmount, rocketWinAmount, limitNormalToHard) {
    if(rocketWinAmount > rocketAmount * limitNormalToHard) {
        return true;
    }
    return false;
}

// check if the user should be in normal mode or hard mode Hard to Normal
async function checkHardToNormal(rocketAmount, rocketWinAmount, limitHardToNormal) {
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