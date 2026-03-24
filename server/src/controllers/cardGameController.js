import User from "../models/User.js";
import CardGameView from "../models/CardGameView.js";
import CardGameLimit from "../models/CardGameLimit.js";
import CardGamePercentage from "../models/CardGamePercentage.js";
import { sendUserResponse } from "../utils/responses.js";
import Setting from "../models/Setting.js";

const calculateMultiplier = async (operator, arrow) => {
    const setting = await Setting.findOne({});
    if (operator === arrow) {
        return operator === ">" ? setting.cardGameGreaterMultipler : operator === "<" ? setting.cardGameLesserMultipler : setting.cardGameEqualMultipler;
    }
    return 0;
}

const generateCardGameNumbers = async (operator, mode) => {
    const cardGamePercentage = await CardGamePercentage.findOne({ arrow: operator });

    const percentages = Number(mode) === 0 ? cardGamePercentage.easy : Number(mode) === 1 ? cardGamePercentage.normal : cardGamePercentage.hard;

    const { A: left, B: right } = generate(percentages, operator);

    const arrow = left > right ? '>' : left < right ? '<' : '=';
    return { left, right, arrow };
}

export const bet = async (req, res) => {
    try {
        const user = await getCardGameUser(req.user.userId);
        
        const { amount, operator } = req.body;
        const numAmount = toNumberOrZero(amount);

        const { left, right, arrow } = await generateCardGameNumbers(operator, req.user.cardGameMode);

        const multi = await calculateMultiplier(operator, arrow);
        
        const lastHistory =
        user.cardGameHistory?.length > 0
            ? user.cardGameHistory[user.cardGameHistory.length - 1]
            : { totalBet: 0, totalWin: 0, cardGameBalance: 0 };
        
        const betEntry = {
            bet: numAmount,
            arrow: arrow,
            left: left,
            right: right,
            win: multi * numAmount,
            totalBet: toNumberOrZero(lastHistory.totalBet) + numAmount,
            totalWin: toNumberOrZero(lastHistory.totalWin) + multi * numAmount,
            cardGameBalance: toNumberOrZero(lastHistory.cardGameBalance) + multi * numAmount - numAmount,
            createAt: new Date(),
        };
        applyCardGameMode(user, betEntry.totalBet, betEntry.cardGameBalance);
    
        user.cardGameHistory.push(betEntry);
        user.balance = toNumberOrZero(user.balance) + multi * numAmount - numAmount;
        await user.save();
        const data = {
            left: left,
            right: right,
            arrow: arrow,
            win: multi * numAmount,
        }
        
        await createCardGameViewEntry({
            userId: user.userId,
            bet: numAmount,
            win: multi * numAmount,
            arrow: arrow,
            left: left,
            right: right,
            time: new Date(),
        });
        scheduleCreditAndBroadcast(req.app);

        return sendUserResponse(res, "", user, {data});
    }
    catch (err) {
        console.log("Error in bet:", err);
    }
}

export const getCardGameView = async (req, res) => {
    try {
        const views = await CardGameView.find().sort({ time: -1 }).limit(12);
        const data = await enrichCardGameViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


const cardGameUserProjection = {
    "wallets.eth.privateKey": 0,
    "wallets.bsc.privateKey": 0,
    "wallets.tron.privateKey": 0,
    password: 0,
    country: 0,
    pumpingMode: 0,
    fishingMode: 0,
    rubicMode: 0,
    cardGameMode: 0,
    partnerId: 0,
    partnerActivity: 0,
    lastClickDate: 0,
    canWithdraw: 0,
};

const getCardGameUser = async (userId) => {
    return User.findOne({ userId }, cardGameUserProjection);
};

const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getLastCardGameView = async () => {
    const last = await CardGameView.find({isUser : 1}).sort({ time: -1 }).limit(1);
    return last?.[0] ?? null;
};

const createCardGameViewEntry = async ({
    userId,
    bet,
    win,
    arrow,
    left,
    right,
    time,
}) => {
    const last = await getLastCardGameView();

    const numBet = toNumberOrZero(bet);
    const numWin = toNumberOrZero(win);

    const totalBet = toNumberOrZero(last?.totalBet) + numBet;
    const totalWin = toNumberOrZero(last?.totalWin) + numWin;

    const cardGameView = new CardGameView({
        userId,
        bet: numBet,
        win: numWin,
        arrow: arrow,
        left: left,
        right: right,
        totalBet,
        totalWin,
        cardGameBalance: totalWin - totalBet,
        isUser: 1,
        time: time,
    });

    await cardGameView.save();
    return cardGameView;
};

async function scheduleCreditAndBroadcast(app) {
    const ably = app?.locals?.ably;
    if (ably) {
        const views = await CardGameView.find().sort({ time: -1 }).limit(12);
        const data = await enrichCardGameViewsWithUser(views);
        ably.channels.get("cardGame").publish("cardGameUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [cardGameController] Ably publish error:", err);
        });
    }
}

async function enrichCardGameViewsWithUser(cardGameViews) {
    return Promise.all(
        cardGameViews.map(async (item) => {
            const user = await User.findOne(
                { userId: item.userId },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    country: 0,
                    pumpingMode: 0,
                    fishingMode: 0,
                    rubicMode: 0,
                    cardGameMode: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    canWithdraw: 0,
                });
            const obj = item.toObject();
            delete obj.isUser;
            delete obj.totalBet;
            delete obj.totalWin;
            delete obj.cardGameBalance;
            if (user) {
                return {
                    ...obj,
                    avatar: user.avatar,
                    altas: user.altas,
                    membership: user.membership,
                };
            }
            return obj;
        })
    );
}

async function applyCardGameMode(user, totalBet, cardGameBalance) {
    const limit =
        (await CardGameLimit.findOne({
            from: { $lte: totalBet },
            to: { $gte: totalBet },
        })) || {};
    if (limit.limitHard != null && cardGameBalance > limit.limitHard) {
        user.cardGameMode = 2;
    } else if (limit.limitNormal != null && cardGameBalance < limit.limitNormal) {
        user.cardGameMode = 1;
    }
}

function generate(p, symbol) {
    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  
    const r = rand(1, 100);
    const enforce = r <= p;
  
    let A, B;
  
    switch (symbol) {
      case ">":
        if (enforce) {
          B = rand(1, 12);
          A = rand(B + 1, 13);
        } else {
          B = rand(1, 13);
          A = rand(1, B);
        }
        break;
  
      case "<":
        if (enforce) {
          A = rand(1, 12);
          B = rand(A + 1, 13);
        } else {
          A = rand(1, 13);
          B = rand(1, A);
        }
        break;
  
      case "=":
        if (enforce) {
          A = rand(1, 13);
          B = A;
        } else {
          A = rand(1, 13);
          do {
            B = rand(1, 13);
          } while (B === A);
        }
        break;

      case ">=":
        if (enforce) {
          B = rand(1, 13);
          A = rand(B, 13);
        } else {
          B = rand(2, 13);
          A = rand(1, B - 1);
        }
        break;
  
      case "<=":
        if (enforce) {
          A = rand(1, 13);
          B = rand(A, 13);
        } else {
          A = rand(2, 13);
          B = rand(1, A - 1);
        }
        break;
  
      default:
        throw new Error("Invalid symbol");
    }
  
    return { A, B };
  }