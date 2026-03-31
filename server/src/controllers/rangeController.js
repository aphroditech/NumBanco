import RangeSettings from '../models/range/RangeSettings.js';
import User from '../models/User.js';
import RangeHistory from '../models/range/RangeHistory.js';
import CalendarRange from '../models/range/CalendarRange.js';
import RangeResult from '../models/range/RangeResult.js';

export const rangeBet = async (req, res) => {
    try {
        const { betAmount, chance, multiplier, min, max } = req.body;

        const bet = parseFloat(betAmount);
        const mainChance = parseFloat(chance);
        const mainMultiplier = parseFloat(multiplier.toFixed(2));

        if (!Number.isFinite(bet) || bet <= 0) {
            return res.status(400).json({ message: 'Invalid bet amount' });
        }

        await User.findOneAndUpdate({ _id: req.user._id }, {
            $inc: {
                balance: -bet,
                totalBet: bet,
                refreshBet: bet,
                lotterybet: bet,
                rangeAmount: bet,
            },
            $push: {
                totalhistory: {
                    amount: -bet,
                    date: new Date(),
                    type: "Range",
                },
            },
        }, { new: true });

        const winningProbability = await getWinningProbability(bet, mainChance, mainMultiplier);
        const isWin = await getIsWin(winningProbability);

        const result = getResult(isWin, min + 1, max - 1);

        let winAmount = 0;
        if (isWin) {
            winAmount = bet * mainMultiplier;
            await User.findOneAndUpdate({ _id: req.user._id }, {
                $inc: {
                    balance: winAmount,
                    totalEarn: winAmount,
                    rangeWinAmount: winAmount,
                },
                $push: {
                    totalhistory: {
                        amount: winAmount,
                        date: new Date(),
                        type: "Win",
                        game: "Range",
                    },
                },
            }, { new: true });
        }

        const rangeHistory = await RangeHistory.findOneAndUpdate(
            { user: req.user._id },
            { $push: { history: { isWin: isWin, betAmount: bet, winAmount: winAmount, multiplier: mainMultiplier, date: new Date() } } },
            { new: true, upsert: true, select: "history" },
        );

        const rangeResult = new RangeResult({
            userName: req.user.altas,
            avatar: req.user.avatar,
            isWin: isWin,
            multiplier: mainMultiplier,
            betAmount: bet,
            winAmount: winAmount || 0,
            date: new Date(),
        });
        await rangeResult.save();

        await CalendarRange.create({
            userName: req.user.altas,
            isWin: isWin,
            betAmount: bet,
            winAmount: winAmount || 0,
            date: new Date(),
        });

        const ably = req.app.locals.ably;
        if (ably) {
            const channel = ably.channels.get("rangeResult");
            channel.publish("RANGE_RESULT", rangeResult);
        }

        console.log("result:", result, "isWin:", isWin, "winningProbability:", winningProbability);
        return res.json({ result, isWin, balance: parseFloat(winAmount - bet), history: rangeHistory?.history || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

async function getWinningProbability(bet, mainChance, mainMultiplier) {
    const rangeSettings = await RangeSettings.findOne();
    if (!rangeSettings) {
        return 0;
    }

    const settings = rangeSettings.multiple?.find(
        (setting) => bet >= setting.minAmount && bet <= setting.maxAmount,
    );
    if (!settings?.multipliers?.length) {
        return 0;
    }
    const tier = settings.multipliers?.find(
        (m) =>
            mainMultiplier >= m.minMultiplier &&
            mainMultiplier <= m.maxMultiplier,
    );
    return tier?.probability ?? 0;

}

async function getIsWin(winningProbability) {
    const random = Math.random();
    return random < winningProbability;
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function getResult(isWin, min, max) {
    const RANGE_MIN = 0;
    const RANGE_MAX = 99;

    if (isWin) return parseInt(getRandom(min, max));

    if (Math.random() < 0.5 && min > RANGE_MIN)
        return parseInt(getRandom(RANGE_MIN, min));

    return parseInt(getRandom(max, RANGE_MAX));
}

export const getRangeResults = async (req, res) => {
    try {
        const results = await RangeResult.find({}).sort({ date: -1 }).limit(15).lean();
        return res.status(200).json({ results });
    } catch (error) {
        console.error('❌ Error getting Range results:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getRangeHistory = async (req, res) => {
    try {
        const doc = await RangeHistory.findOne({ user: req.user._id }).select("history").lean();
        return res.status(200).json({ history: Array.isArray(doc?.history) ? doc.history : [] });
    } catch (error) {
        console.error('❌ Error getting Range history:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}