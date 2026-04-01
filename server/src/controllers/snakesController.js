import User from '../models/User.js';
import SnakesSetting from '../models/snakes/SnakesSettings.js';
import SnakeResult from '../models/snakes/SnakeResult.js';
import SnakeHistory from '../models/snakes/SnakeHistory.js';
import CalendarSnake from '../models/snakes/CalendarSnake.js';

export const bet = async (req, res) => {
    try {
        const { betAmount, level, step, multiplier, isStart = false } = req.body;

        const bet = Number(betAmount);
        if (!Number.isFinite(bet) || bet <= 0 || bet > 20) {
            return res.status(400).json({ message: "Bet amount must be greater than 0 and less than 20" });
        }

        const snakesSettings = await SnakesSetting.findOne();
        const stepSettings = snakesSettings[step];
        if (!stepSettings) {
            return res.status(400).json({ message: 'Step not found' });
        }
        const historyEntry = {
            amount: -bet,
            date: new Date(),
            game: "Snakes",
            type: "Lose",
        };

        if (isStart) {
            const updated = await User.findOneAndUpdate(
                { _id: req.user._id, balance: { $gte: bet } },
                {
                    $inc: {
                        balance: -bet,
                        totalBet: bet,
                        refreshBet: bet,
                        lotterybet: bet,
                        snakesAmount: bet,
                    },
                    $push: { totalhistory: historyEntry },
                },
                { new: true, select: "balance snakesAmount snakesWinAmount" },
            );
            if (!updated) {
                return res.status(400).json({ message: "User not found or insufficient balance" });
            }
        }

        const diceSum = getDiceSum(level, multiplier, stepSettings, bet);

        console.log("diceSum", diceSum);

        return res.status(200).json({ message: "Bet successful", balance: isStart ? -bet : 0, diceSum })

    } catch (error) {
        console.error('❌ Error betting on Snakes:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const getDiceSum = (level, multiplier, stepSettings, bet) => {
    if (level === "easy" && multiplier > 2.5) { return 7; }
    if (level === "medium" && multiplier > 3.5) { return 7; }
    if (level === "hard" && multiplier > 4.5) { return 7; }
    if (bet >= 15 && bet <= 20 && multiplier > 1.2) { return 7; }

    const totalWeight = stepSettings.reduce(
        (sum, item) => sum + Number(level === "easy" ? item.probabililty[0].easy : level === "medium" ? item.probabililty[0].medium : item.probabililty[0].hard),
        0
    ) || 0;

    let random = Math.random() * totalWeight;

    for (const item of stepSettings) {
        random -= Number(level === "easy" ? item.probabililty[0].easy : level === "medium" ? item.probabililty[0].medium : item.probabililty[0].hard);

        if (random < 0) {
            return item.sum;
        }
    }

    return 7;
}

export const cashOut = async (req, res) => {
    try {
        const { multiplier, betAmount, step, level } = req.body;

        const bet = Number(betAmount);
        if (!Number.isFinite(bet) || bet <= 0 || bet > 20) {
            return res.status(400).json({ message: "Bet amount must be greater than 0 and less than 20" });
        }

        const win = bet * multiplier;

        const user = await User.findOneAndUpdate(
            { _id: req.user._id },
            {
                $inc: {
                    balance: win,
                    snakesWinAmount: win,
                    totalEarn: win,
                },
                $push: {
                    totalhistory: {
                        amount: win,
                        date: new Date(),
                        type: "Win",
                        game: "Snakes",
                    },
                },
            },
            { new: true, select: "balance snakesWinAmount altas avatar" },
        );

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Save the history to the database
        const snakeHistory = await SnakeHistory.findOneAndUpdate(
            { user: user._id },
            { $push: { history: { isWin: true, betAmount: bet, winAmount: win, multiplier: multiplier, level: level, step: step, date: new Date() } } },
            { new: true, upsert: true, select: "history" },
        );

        await CalendarSnake.create({
            userName: user.altas,
            isWin: true,
            level: level || "easy",
            betAmount: bet,
            winAmount: win,
            date: new Date(),
        });


        // Save the result to the database
        const snakeResult = new SnakeResult({
            userName: user.altas,
            avatar: user.avatar,
            isWin: true,
            multiplier: multiplier,
            betAmount: bet,
            winAmount: win,
        });
        await snakeResult.save();

        const ably = req.app.locals.ably;
        if (ably) {
            const channel = ably.channels.get("snakesResult");
            channel.publish("SNAKES_RESULT", snakeResult);
        }

        return res.status(200).json({ message: "Cash out successful", balance: parseFloat(win.toFixed(2)), history: snakeHistory?.history || [] });

    } catch (error) {
        console.error('❌ Error cashing out on Snakes:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const bangSnake = async (req, res) => {
    try {
        const { multiplier, betAmount, step, level } = req.body;
        const bet = Number(betAmount);
        if (!Number.isFinite(bet) || bet <= 0 || bet > 20) {
            return res.status(400).json({ message: "Bet amount must be greater than 0 and less than 20" });
        }

        const snakeHistory = await SnakeHistory.findOneAndUpdate(
            { user: req.user._id },
            { $push: { history: { isWin: false, betAmount: bet, winAmount: 0, multiplier: multiplier, level: level, step: step, date: new Date() } } },
            { new: true, upsert: true, select: "history" },
        );

        await CalendarSnake.create({
            userName: req.user.altas,
            isWin: false,
            level: level || "easy",
            betAmount: bet,
            winAmount: 0,
            date: new Date(),
        });

        const snakeResult = new SnakeResult({
            userName: req.user.altas,
            avatar: req.user.avatar,
            isWin: false,
            multiplier: 0,
            betAmount: bet,
            winAmount: 0,
            date: new Date(),
        });
        await snakeResult.save();

        const ably = req.app.locals.ably;
        if (ably) {
            const channel = ably.channels.get("snakesResult");
            channel.publish("SNAKES_RESULT", snakeResult);
        }

        return res.status(200).json({ message: "Snake banged successfully", history: snakeHistory?.history || [] });

    }
    catch (error) {
        console.error('❌ Error banging Snake:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getSnakeResults = async (req, res) => {
    try {
        const results = await SnakeResult.find({}).sort({ date: -1 }).limit(16).lean();
        return res.status(200).json({ results });
    } catch (error) {
        console.error('❌ Error getting Snakes results:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getSnakeHistory = async (req, res) => {
    try {
        const doc = await SnakeHistory.findOne({ user: req.user._id }).select("history").lean();
        return res.status(200).json({ history: Array.isArray(doc?.history) ? doc.history : [] });
    } catch (error) {
        console.error('❌ Error getting Snake history:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}