import User from "../models/User.js";
import RocketSettings from "../models/RocketSettings.js";
import RocketHistory from "../models/RocketHistory.js";
import RocketResult from "../models/RocketResult.js";

export const bet = async (req, res) => {
    try {
        const { bet, level } = req.body;
        const user = await User.findById(req.user._id);
        const rocketSettings = await RocketSettings.findOne();
        if (!rocketSettings) {
            return res.status(404).json({ error: "Rocket settings not found" });
        }
        let multiplier = await getMultiplier();
        
        // add neccesary fields to user
        user.balance -= bet;
        user.totalBet += bet;
        user.lotterybet += bet;
        user.refreshBet += bet;
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

        return res.json({ balance: user.balance, multiplier: multiplier });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

async function getMultiplier() {

    const settings = await RocketSettings.findOne({});

    const multipliers = settings.multiple;

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

        // save bet result
        const data = {
            userName: user.altas,
            avatar: user.avatar,
            isWin: isWin,
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

        if (isWin) {
            return  res.json({ balance: user.balance} );
        }
    } catch (error) {
        console.error(error);
    }
}


export const getRocketResults = async (req, res) => {
    try {
        const rocketResults = await RocketResult.find({}).sort({ createAt: -1 }).limit(23);
        return res.json(rocketResults);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}