import User from '../models/User.js';
import CoinSettings from '../models/coin/CoinSettings.js';
import CoinHistory from '../models/coin/CoinHistory.js';
import CoinResult from '../models/coin/CoinResult.js';

const USER_BET_SELECT =
    'balance totalBet refreshBet lotterybet coinAmount coinWinAmount coinMode totalhistory';

export const bet = async (req, res) => {
    try {
        const { betAmount, flip } = req.body;
        const betNum = Number(betAmount);
        if (!Number.isFinite(betNum) || betNum <= 0) {
            return res.status(400).json({ message: 'Invalid bet amount or insufficient balance', error: 'Invalid bet amount or insufficient balance' });
        }

        const userId = req.user._id;

        // Parallel reads (1 round-trip each); lean() on read-only docs.
        const [user, coinSettings, coinHistoryDoc] = await Promise.all([
            User.findById(userId).select(USER_BET_SELECT).exec(),
            CoinSettings.findOne().lean(),
            CoinHistory.findOne({ user: userId }).select('history').lean(),
        ]);

        if (!user || !coinSettings) {
            return res.status(404).json({ message: 'User not found or coin settings not found', error: 'User not found or coin settings not found' });
        }

        if (user.balance < betNum) {
            return res.status(400).json({ message: 'Invalid bet amount or insufficient balance', error: 'Insufficient balance' });
        }

        const tempNumbers = coinSettings.multiple?.find(
            (item) => betNum >= item.min && betNum < item.max
        );
        if (!tempNumbers) {
            return res.status(400).json({ message: 'Invalid bet amount', error: 'Invalid bet amount' });
        }

        const { probability, totalNumber, canWinNumber, min, max } = tempNumbers;

        const historyArr = Array.isArray(coinHistoryDoc?.history) ? coinHistoryDoc.history : [];
        const conditionHistory = historyArr.filter((h) => h.betAmount >= min && h.betAmount < max);
        const recentCount = conditionHistory.length ? conditionHistory.length % totalNumber : 0;
        const lastN =
            recentCount > 0
                ? conditionHistory.slice(-recentCount)
                : conditionHistory.slice(-totalNumber);
        const wins = lastN.filter((h) => h.isWin === true).length;

        user.balance -= betNum;
        user.totalBet = (user.totalBet ?? 0) + betNum;
        user.refreshBet = (user.refreshBet ?? 0) + betNum;
        user.lotterybet = (user.lotterybet ?? 0) + betNum;
        user.coinAmount = (user.coinAmount ?? 0) + betNum;

        // `totalhistory` may be missing on older documents; projection must include the field (see USER_BET_SELECT).
        if (!Array.isArray(user.totalhistory)) {
            user.totalhistory = [];
        }
        user.totalhistory.push({
            amount: -betNum,
            date: new Date(),
            type: 'Lose',
            game: 'Coin Flip',
        });

        await user.save({ optimisticConcurrency: false });

        if (wins >= canWinNumber) {
            return res.json({ balance: -betNum, M1uXj3sZpU: 0, flip: flip === 1 ? 0 : 1 });
        }

        const landom = Math.random();
        if (landom < probability) {
            return res.json({ balance: -betNum, M1uXj3sZpU: 1, flip });
        }
        return res.json({ balance: -betNum, M1uXj3sZpU: 0, flip: flip === 1 ? 0 : 1 });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

export const getCoinFlipResults = async (req, res) => {
    try {
        const coinResults = await CoinResult.find({}).sort({ date: -1 }).limit(12).lean();
        return res.json({ coinResults });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


export const spinComplete = async (req, res) => {
    try {
        const { isWin, flip, result, betAmount } = req.body;
        const userId = req.user._id;
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({ message: 'User not found', error: 'User not found' });

        let winAmount = 0;
        if(isWin) {
            winAmount = betAmount * 1.95;
            user.balance += winAmount;
            user.totalEarn += winAmount;
            user.coinWinAmount += winAmount;
            user.totalhistory.push({
                amount: winAmount,
                date: new Date(),
                type: 'Win',
                game: 'Coin Flip',
            });
        }
        const coinHistory = await CoinHistory.findOne({ user: userId });
        if(!coinHistory) {
            const newCoinHistory = new CoinHistory({
                user: userId,
                history: [{
                    isWin: isWin,
                    flip: flip,
                    result: result,
                    betAmount: betAmount,
                    winAmount: winAmount,
                    date: new Date(),
                }]
            });
            await newCoinHistory.save();
        } else {
            coinHistory.history.push({
                isWin: isWin,
                flip: flip,
                result: result,
                betAmount: betAmount,
                winAmount: winAmount,
                date: new Date(),
            });
            await coinHistory.save();
        }
        await user.save();

        const resultData = {
            userName: user.altas,
            avatar: user.avatar,
            isWin: isWin,
            flip: flip,
            result: result,
            betAmount: betAmount,
            winAmount: winAmount,
            date: new Date(),
        };

        await CoinResult.create(resultData);

        // Real-time feed (client: `coinFlipResult` + event `COIN_FLIP_RESULT`). Requires `app.locals.ably` in server.js.
        const ably = req.app.locals.ablyDiceGames ?? req.app.locals.ably;
        if (ably?.channels) {
            try {
                const payload = {
                    userName: user.altas ?? '',
                    avatar: user.avatar ?? '',
                    isWin: Boolean(isWin),
                    flip: Number(flip),
                    result: Number(result),
                    betAmount: Number(betAmount),
                    winAmount: Number(winAmount),
                    date: resultData.date instanceof Date ? resultData.date.toISOString() : new Date().toISOString(),
                };
                await ably.channels.get('coinFlipResult').publish('COIN_FLIP_RESULT', payload);
            } catch (ablyErr) {
                console.error('❌ [coin] Ably publish failed:', ablyErr?.message || ablyErr);
            }
        }

        const coinHistoryData = await CoinHistory.findOne({ user: userId });
        return res.json({ message: 'Coin spin complete', balance: winAmount, history: coinHistoryData?.history || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getCoinHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const coinHistory = await CoinHistory.findOne({ user: userId }).select('history').lean();
        return res.json({ history: coinHistory?.history || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}