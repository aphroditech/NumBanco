import DoveHistory from "../models/dove/DoveHistory.js";
import DoveView from "../models/dove/DoveView.js";
import User from "../models/User.js";
import DoveSettings from "../models/dove/DoveSettings.js";
import CalendarDove from "../models/dove/CalendarDove.js";

const MAX_BET_AMOUNT = 20;
const VIEW_LIMIT = 22;
const MAX_LANES = 20;

function buildUserNotification(message, status = "success", from = "Lucky Hop", to = "") {
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        notification: message,
        status,
        from,
        to,
        unread: true,
    };
}

async function pushUserNotification(userId, message, status = "success") {
    if (!userId || !message) return;
    try {
        await User.updateOne(
            { _id: userId },
            {
                $push: {
                    notification: buildUserNotification(message, status, "Lucky Hop", ""),
                },
            }
        );
    } catch (e) {
        console.warn("[dove] pushUserNotification failed:", e?.message || e);
    }
}

function getModeParams(settings, difficulty) {
    if (difficulty === "easy") return settings?.easy || { a: 0.2, b: 0.05 };
    if (difficulty === "med") return settings?.med || { a: 0.15, b: 0.03 };
    if (difficulty === "difficult" || difficulty === "hard") return settings?.hard || { a: 0.1, b: 0.02 };
    return settings?.ace || { a: 0.08, b: 0.01 };
}

function getMultiplier(step, a, b) {
    if (step <= 1) return 0.5;
    if (step <= 2) return 1;
    const s = step - 2;
    return 1 + a * s + b * s * s;
}

function getExpectedValueForFail(level, settings, difficulty) {
    const { a, b } = getModeParams(settings, difficulty);
    const prevStep = Math.max(0, (Number(level) || 1) - 1);
    return getMultiplier(prevStep, a, b);
}

function getExpectedValueForCashOut(level, settings, difficulty) {
    const { a, b } = getModeParams(settings, difficulty);
    const currentStep = Math.max(1, Number(level) || 1);
    const currentMultiplier = getMultiplier(currentStep, a, b);
    const candidates = [];
    for (let s = currentStep + 1; s <= MAX_LANES; s++) {
        const m = getMultiplier(s, a, b);
        if (m > currentMultiplier) candidates.push(m);
    }
    if (candidates.length === 0) return currentMultiplier;
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
}

async function enrichDoveViewsWithUser(doveViews) {
    return Promise.all(
        doveViews.map(async (item) => {
            const user = await User.findOne(
                { _id: item.userId },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    country: 0,
                    doveMode: 0,
                    doveAmount: 0,
                    doveWinAmount: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    
                }
            );
            const obj = item.toObject();
            delete obj.isUser;
            if (user) {
                return {
                    ...obj,
                    avatar: user.avatar,
                    altas: user.altas,
                };
            }
            return { ...obj, avatar: null, altas: "Player" };
        })
    );
}

async function publishDoveViewToAbly(app) {
    const ably = app?.locals?.ably;
    if (!ably) return;
    try {
        const views = await DoveView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichDoveViewsWithUser(views);
        ably.channels.get("doveGame").publish("doveUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [doveController] Ably publish error:", err);
        });
    } catch (err) {
        console.error("❌ [doveController] Error publishing dove view:", err);
    }
}

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
        const doveHistory = await DoveHistory.findOne({ user: userId });
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
            if(doveHistory) {
                doveHistory.history.push({
                    bet: bet,
                    multiplier: multiplier,
                    winAmt: 0,
                    profit: 0,
                    timestamp: new Date(),
                });
            } else {
                const newDoveHistory = new DoveHistory({
                    user: userId,
                    history: [{
                        bet: bet,
                        multiplier: multiplier,
                        winAmt: 0,
                        profit: 0,
                        timestamp: new Date(),
                    }]
                });
                await newDoveHistory.save();
            }
            await doveHistory.save();
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
        const { bet, multiplier, level, difficulty } = req.body;

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
        const doveSettings = await DoveSettings.findOne();
        const expectedValue = getExpectedValueForCashOut(level, doveSettings, difficulty);

        const doveView = new DoveView({
            userId: userId,
            bet: betNum,
            multiplier: Number(multiplier) || 0,
            win: winAmount,
            expectedValue: Number(expectedValue) || 0,
            isUser: user.partnerLevel > 0 ? 1 : 0,
        });
        await doveView.save();
        publishDoveViewToAbly(req.app);

        // Push in-app notification (appears in Notifications dropdown).
        // This is the "cash out amount" the user asked to display.
        const cashOutAmt = Number(winAmount) || 0;
        await pushUserNotification(
            userId,
            `You cashed out $${cashOutAmt.toFixed(2)} in Lucky Hop.`,
            "success"
        );

        return res.json({ balance: user.balance });
    }
    catch (err) {
        console.error("Error getting dove earnings:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const getDoveView = async (req, res) => {
    try {
        const views = await DoveView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichDoveViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Error getting dove view:", error);
        return res.status(500).json({ error: error.message });
    }
};

export const getMyDoveHistory = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const data = await DoveView.find({ userId })
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Error getting my dove history:", error);
        return res.status(500).json({ error: error.message });
    }
};

export const reportDoveFail = async (req, res) => {
    try {
        const userId = req.user._id;
        const { bet, multiplier, level, difficulty } = req.body;

        const betNum = Number(bet) || 0;
        if (betNum < 0.1 || betNum > MAX_BET_AMOUNT) {
            return res.status(400).json({ error: `Bet must be between 0.1 and ${MAX_BET_AMOUNT}` });
        }

        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const doveSettings = await DoveSettings.findOne();
        const expectedValue = getExpectedValueForFail(level, doveSettings, difficulty);

        await CalendarDove.create({
            userName: user.altas,
            isWin: false,
            betAmount: betNum,
            winAmount: 0,
            date: new Date()
        });

        const doveView = new DoveView({
            userId: userId,
            bet: betNum,
            multiplier: Number(multiplier) || 0,
            win: 0,
            expectedValue: Number(expectedValue) || 0,
            isUser: user.partnerLevel > 0 ? 1 : 0,
        });
        await doveView.save();
        publishDoveViewToAbly(req.app);

        return res.json({ ok: true });
    } catch (err) {
        console.error("Error reporting dove fail:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};