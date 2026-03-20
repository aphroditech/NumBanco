import DoveHistory from "../models/DoveHistory.js";
import User from "../models/User.js";
import DoveSettings from "../models/DoveSettings.js";
import CalendarDove from "../models/CalendarDove.js";

const MAX_BET_AMOUNT = 20;

export const checkDoveWin = async (req, res) => {
    try {
        const userId = req.user._id;
        const { bet, multiplier, level, isStart } = req.body;

        const betNum = Number(bet) || 0;
        if (betNum < 0.1 || betNum > MAX_BET_AMOUNT) {
            return res.status(400).json({ error: `Bet must be between 0.1 and ${MAX_BET_AMOUNT}` });
        }

        let user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const doveSettings = await DoveSettings.findOne();
        if (!doveSettings) {
            return res.status(500).json({ error: "Dove settings not found" });
        }
        if (isStart) {
            user.balance -= bet;
            user.doveAmount += bet;
            user.totalBet += bet;
            user.refreshBet += bet;
            user.lotterybet += bet;
            user.totalhistory.push({
                amount: -bet,
                date: new Date(),
                type: "Bet Dove"
            });
            await user.save();
        }
        user = await User.findOne({ _id: userId });
        if(user.doveMode == 1 && (await checkNormalToHard(user._id))) {
            user.doveMode = 2;
            await user.save();
            console.log("user is in hard mode");
        } else if(user.doveMode == 2 && (await checkHardToNormal(user._id))) {
            user.doveMode = 1;
            await user.save();
            console.log("user is in normal mode");
        }
        user = await User.findOne({ _id: userId });
        const doveMode = user.doveMode;
        const isWin = calculateWin(bet, level, doveSettings,multiplier, doveMode);
        user = await User.findOne({ _id: userId });

        if(isWin) {
            return res.json({ M1uXj3sZpU : 1, ...(isStart && { balance: user.balance }) });
            
        } else {
            await CalendarDove.create({
                userName: user.altas,
                isWin: false,
                betAmount: bet,
                winAmount: 0,
                date: new Date()
            })
            return res.json({ M1uXj3sZpU: 0 });
        }

    } catch (err) {
        console.error("Error checking dove win:", err);
        return res.status(500).json({ error: "Error checking dove win" });
    }
}


function calculateWin(bet, level, doveSettings,multiplier, doveMode) {
    const { probability, RTP } = doveSettings;
    let mainProbability = RTP / multiplier;
    
    const tempTimes = probability.find(prob => {
        if (bet >= prob.min && bet <= prob.max) {
            return prob.times;
        }
    });

    mainProbability *= tempTimes?.times || 1;
    if(doveMode == 2) {
        mainProbability *= 0.7;
    }
    const isWin = Math.random() < mainProbability;
    if(isWin) {
        return 1;
    }
    return 0;
}


//  get prefix
export const getPrefix = async (req, res) => {
    try {
        const doveSettings = await DoveSettings.findOne();
        if (!doveSettings) {
            return res.status(500).json({ error: "Dove settings not found" });
        }
        const { easy, med, hard, ace } = doveSettings;
        return res.json({ easy, med, hard, ace });
    } catch (err) {
        console.error("Error getting dove prefix:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// check if the user should be in hard mode or normal mode Normal to Hard
async function checkNormalToHard(userId) {
    const user = await User.findOne({ _id: userId });
    if (!user) {
        return false;
    }
    const doveAmount = user.doveAmount;
    const doveWinAmount = user.doveWinAmount;
    if(doveWinAmount >= doveAmount*1.2) {
        return true;
    }
    return false;
}

// check if the user should be in normal mode or hard mode Hard to Normal
async function checkHardToNormal(userId) {
    const user = await User.findOne({ _id: userId });
    if (!user) {
        return false;
    }
    const doveAmount = user.doveAmount;
    const doveWinAmount = user.doveWinAmount;
    if(doveWinAmount <= doveAmount*0.6) {
        return true;
    }
    return false;
}

// get dove earnings
export const getDoveEarnings = async (req, res) => {
    try {
        const userId = req.user._id;
        const { bet, multiplier, level } = req.body;

        const betNum = Number(bet) || 0;
        if (betNum < 0.1 || betNum > MAX_BET_AMOUNT) {
            return res.status(400).json({ error: `Bet must be between 0.1 and ${MAX_BET_AMOUNT}` });
        }

        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const winAmount = (Number(bet) || 0) * (Number(multiplier) || 0);

        user.balance = (user.balance || 0) + winAmount;
        user.totalEarn = (user.totalEarn || 0) + winAmount;
        user.doveWinAmount = (user.doveWinAmount || 0) + winAmount;
        if (!user.totalhistory) user.totalhistory = [];
        user.totalhistory.push({
            amount: winAmount,
            date: new Date(),
            type: "Win Dove"
        });
        await user.save();
        await CalendarDove.create({
            userName: user.altas,
            isWin: true,
            betAmount: bet,
            winAmount: winAmount,
            date: new Date()
        });
        let doveHistory = await DoveHistory.findOne({ user: userId });
        if(!doveHistory) {
            doveHistory = new DoveHistory({ 
                user: userId,
                history: [{
                    bet: bet,
                    multiplier: multiplier,
                    winAmt: winAmount,
                    profit: winAmount - bet,
                    timestamp: new Date(),
                }]
            });
        } else {
            doveHistory.history.push({
                bet: bet,
                multiplier: multiplier,
                profit: winAmount - bet,
                winAmt: winAmount,
                timestamp: new Date(),
            });
        }
        await doveHistory.save();

        return res.json({ balance: user.balance });
    }
    catch (err) {
        console.error("Error getting dove earnings:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}