import User from "../models/User.js";
import RubicResult from "../models/RubicResult.js";
import RubicSetting from "../models/RubicSetting.js";
import UserRubic from "../models/UserRubic.js";

export const handleRubicBet = async (req, res) => {
    try {
        const { betAmount, target, operation, result } = req.body;
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );

        let winAmount = 0;
        let multiplier = 0;
        let isWin = false;

        ({ multiplier, winAmount } = calculateRubicWin(betAmount, target, operation));
        if (checkRubicWin(result, target, operation)) {
            isWin = true;
            user.balance = (1000 * user.balance + 1000 * winAmount) / 1000;
            user.totalEarn = (1000 * user.totalEarn + 1000 * winAmount) / 1000;

            user.totalhistory.push({
                amount: winAmount,
                date: new Date(),
                type: "rubic"
            });
        } else {
            winAmount = 0;
        }

        user.rubicHistory.push({
            target: target,
            betAmount: betAmount,
            operation: operation,
            result: result,
            profit: isWin ? winAmount : 0,
            multiplier: multiplier || 0,
            isWin: isWin,
            createAt: new Date(),
        });
        await user.save();
        await RubicResult.create({
            userName: user.altas,
            avatar: user.avatar,
            isWin: isWin,
            betAmount: betAmount,
            winAmount: winAmount,
        });

        // The data of Calendar
        await UserRubic.create({
            userName: user.altas,
            isWin: isWin,
            betAmount: betAmount,
            winAmount: winAmount,
        });

        const ably = req.app.locals.ably;
        if (ably) {
            const channelName = "rubicResult";
            const channel = ably.channels.get(channelName);

            const data = {
                userName: user.altas,
                avatar: user.avatar,
                isWin: isWin,
                betAmount: betAmount,
                winAmount: winAmount,
            };
            channel.publish("RUBIC_RESULT", data);
        }
        return res.status(200).json({ user: user, message: isWin ? "You Won, you earned $" + truncateToTwo(winAmount) + " in rubic game" : "You lose in rubic game", winAmount: winAmount, isWin: isWin });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

// check if the user wins
const checkRubicWin = (result, target, op) => {
    if (op === '>') return result > target;
    if (op === '=') return result === target;
    if (op === '<') return result < target;
    return false;
};

// calculate the win amount and multiplier
const calculateRubicWin = (betAmount, target, op) => {
    const targetNum = parseInt(target, 10);

    // Payout multipliers table based on target and operator
    // For '<' (small) operator
    if (op === '<') {
        const smallMultipliers = {
            1: null,    // error - invalid (can't roll less than 1)
            2: 5,
            3: 2.5,
            4: 1.95,
            5: 1.25,
            6: 0.9
        };
        const multiplier = smallMultipliers[targetNum];
        if (multiplier === null || multiplier === undefined) {
            return 0; // Invalid combination
        }
        return { multiplier: multiplier, winAmount: betAmount * multiplier };
    }

    // For '>' (large) operator
    if (op === '>') {
        const largeMultipliers = {
            1: 0.9,
            2: 1.25,
            3: 1.95,
            4: 2.5,
            5: 5,
            6: null    // error - invalid (can't roll more than 6)
        };
        const multiplier = largeMultipliers[targetNum];
        if (multiplier === null || multiplier === undefined) {
            return 0; // Invalid combination
        }
        return { multiplier: multiplier, winAmount: betAmount * multiplier };
    }

    // For '=' (same) operator
    if (op === '=') {
        // All targets have multiplier of 10 for 'same'
        return { multiplier: 10, winAmount: betAmount * 10 };
    }

    return 0;
};

export const removeUserBalance = async (req, res) => {
    try {
        const { amount, target, operation } = req.body;

        // User Data Changes for Rubic
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );
        const userRubicAmount = user.rubicHistory.reduce((acc, curr) => acc + curr.betAmount, 0);
        const userRubicWinAmount = user.rubicHistory.reduce((acc, curr) => acc + (curr.isWin ? curr.profit : 0), 0);

        // check if the user should be in hard mode or normal mode
        if (user.rubicMode == 1 && await checkNormalToHard(userRubicAmount, userRubicWinAmount)) {
            console.log("user should be in hard mode");
            user.rubicMode = 2;
        } else if (user.rubicMode == 2 && await checkHardToNormal(userRubicAmount, userRubicWinAmount)) {
            user.rubicMode = 1;
        }

        // check if the user has enough balance
        if (user.balance < amount) {
            return res.status(400).json({ success: false, user: user, message: "You don't have enough money" });
        }

        // update the user's balance
        user.balance = (1000 * user.balance - 1000 * amount) / 1000;
        user.totalBet = (1000 * user.totalBet + 1000 * amount) / 1000;
        user.refreshBet = (1000 * user.refreshBet + 1000 * amount) / 1000;
        user.lotterybet = (1000 * user.lotterybet + 1000 * amount) / 1000;
        user.totalhistory.push({
            amount: -amount,
            date: new Date(),
            type: "rubic"
        });

        await user.save();

        // Calculate the wining probability for Rubic
        const winningProbability = await calculateWiningProbability(amount, target, operation, user.rubicMode, user.rubicHistory);
        // console.log("winningProbability", winningProbability);
        return res.status(200).json({ user: user, M1uXj3sZ: winningProbability });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

async function checkNormalToHard(userRubicAmount, userRubicWinAmount) {
    const rubicSettings = await RubicSetting.findOne({});
    const limitNormalToHard = rubicSettings.limitNormalToHard;

    const range = limitNormalToHard.find(r =>
        userRubicAmount >= r.min && userRubicAmount < r.max && userRubicWinAmount >= r.limitAmt
    );
    return range ? true : false;
}

async function checkHardToNormal(userRubicAmount, userRubicWinAmount) {
    const rubicSettings = await RubicSetting.findOne({});
    if (userRubicAmount * rubicSettings.limitHardToNormal > userRubicWinAmount) {
        return true;
    }
    return false;
}

async function calculateWiningProbability(amount, target, operation, rubicMode, rubicHistory) {
    const rubicSettings = await RubicSetting.findOne({});
    const payoutMultiplier = getPayoutMultiplier(target, operation);

    const times = "times" + payoutMultiplier;

    let tempProbability = rubicSettings[times].find(r => amount >= r.min && amount < r.max);
    let winningProbability = tempProbability ? tempProbability.probability : 0;
    // console.log("winningProbability", winningProbability, "rubicMode", rubicMode);

    if (rubicMode === 2) { // hard mode
        winningProbability = winningProbability * 0.5;
    } else if (rubicMode === 0) { // easy mode
        winningProbability = winningProbability * 1.2;
    }

    if (await checkWinningNumber(payoutMultiplier, amount, rubicHistory)) {
        console.log("checkWinningNumber", payoutMultiplier, amount, "winningProbability", winningProbability);
        winningProbability = 0;
    }

    // console.log("winningProbability", winningProbability, "rubicMode", rubicMode);
    return winningProbability;
}

function getPayoutMultiplier(target, operator) {
    const payoutTable = {
        1: { '<': null, '>': 0.9, '=': 10 },
        2: { '<': 5, '>': 1.25, '=': 10 },
        3: { '<': 2.5, '>': 1.95, '=': 10 },
        4: { '<': 1.95, '>': 2.5, '=': 10 },
        5: { '<': 1.25, '>': 5, '=': 10 },
        6: { '<': 0.9, '>': null, '=': 10 },
    };

    const targetData = payoutTable[target];
    const multiplier = targetData[operator];

    return multiplier * 100;
}

async function checkWinningNumber(multiplier, amount, rubicHistory) {
    const rubicSettings = await RubicSetting.findOne({});
    const times = "times" + multiplier;
    const tempNumbers = rubicSettings[times]?.find(r => amount >= r.min && amount < r.max);
    if (!tempNumbers || tempNumbers.totalNumber == null || tempNumbers.winningNumber == null) {
        return false;
    }
    const { min, max, totalNumber, winningNumber } = tempNumbers;

    // Filter history to bets within the amount range
    const inRange = rubicHistory.filter(h => h.betAmount >= min && h.betAmount < max && h.multiplier == multiplier / 100);
    // Take the last totalNumber bets (most recent)
    const recentHistory = inRange.length % totalNumber;
    const lastN = recentHistory > 0 ? inRange.slice(-recentHistory) : inRange.slice(-totalNumber);

    const wins = lastN.filter(h => h.isWin).length;
    return wins >= winningNumber;
}

export const truncateToTwo = (num) => {
    if (num === null || num === undefined) return "";
    if (num.toString().split(".")[1]?.length < 5) return num;

    const [intPart, decPart = ""] = num.toString().split(".");
    const truncatedDec = decPart.slice(0, 2).replace(/0+$/, "");

    return truncatedDec ? `${intPart}.${truncatedDec}` : intPart;
};

export const getUserRubicHistory = async (req, res) => {
    try {
        const rubicHistory = await RubicResult.find({}).sort({ createAt: -1 }).limit(12);
        return res.status(200).json(rubicHistory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

