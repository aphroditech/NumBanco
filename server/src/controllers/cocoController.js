import User from "../models/User.js";
import { sendUserResponse } from "../utils/responses.js";
import CocoView from "../models/CocoView.js";
import CocoState from "../models/CocoState.js";

const CREDIT_DELAY_MS = 300;
const VIEW_LIMIT = 18;
const multiTable = [
    0.5,
    1.05,
    1.2,
    1.35,
    1.5,
    2.0,
];

const TARGET_SUM = 6;

const rand = (min, max) => min + Math.random() * (max - min);

async function getState(userId) {
    return CocoState.findOne({ userId });
}

async function setState(userId, state) {
    return CocoState.findOneAndUpdate(
        { userId },
        { $set: { ...state, userId } },
        { upsert: true, new: true }
    );
}

async function clearState(userId) {
    await CocoState.deleteOne({ userId });
}


async function scheduleCreditAndBroadcast(userId, win, app) {

    const ably = app?.locals?.ably;
    if (ably) {
        const views = await CocoView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichCocoViewsWithUser(views);
        ably.channels.get("cocoGame").publish("cocoUpdate", { updatedData: data }).catch((err) => {
            console.error("❌ [cocoController] Ably publish error:", err);
        });
    }
}


export const smash = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        const betAmount = Number(req.body?.betAmount ?? 0);
        const newBalance = Number(req.user?.balance ?? 0) - betAmount;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!betAmount || betAmount <= 0) {
            return res.status(400).json({ error: "Invalid bet amount" });
        }

        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
            }
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (newBalance < 0) {
            return res.status(400).json({
                error: "Insufficient balance",
                message: "Insufficient balance",
            });
        }

        user.balance = newBalance;
        let state = await getState(userId);

        // Allow changing betAmount between hits: always sync the in-round state bet
        // with the current betAmount from request.
        if (state) {
            state.bet = betAmount;
        }

        // Start new round if no state
        if (!state) {
            user.totalhistory = user.totalhistory || [];
            user.totalhistory.push({
                amount: -betAmount,
                date: new Date(),
                type: "tapcrash",
            });
            state = {
                bet: betAmount,
                successCount: 0,
                currentMultiplier: 0.0,
                totalSum: 0,
                ready: false,
            };
            await setState(userId, state);
        }

        // FINAL HIT (tower break on next smash)

        if (state.ready) {

            const finalMulti =
                Math.round(rand(3.5, 6) * 100) / 100;

            let win =
                Math.round(state.bet * finalMulti * 100) / 100;

            user.balance += win;

            user.totalhistory.push({
                amount: win,
                date: new Date(),
                type: "tapcrash",
            });

            await clearState(userId);

            await user.save();

            await CocoView.create({
                userId: req.user.userId,
                bet: state.bet,
                win,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
            });

            setTimeout(
                () => scheduleCreditAndBroadcast(req.user.userId, 0, req.app),
                CREDIT_DELAY_MS
            );

            return sendUserResponse(res, "", user, {
                multi: finalMulti,
                lastWin: win,
                combo: state.successCount,
            });
        }


        const success = Math.random() < 0.7;

        if (!success) {
            state.successCount = 0;
            state.currentMultiplier = 0.0;
            await setState(userId, {
                bet: state.bet,
                successCount: state.successCount,
                currentMultiplier: state.currentMultiplier,
                totalSum: state.totalSum,
                ready: state.ready,
            });
            await user.save();

            await CocoView.create({
                userId: req.user.userId,
                bet: state.bet,
                win: 0,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
            });

            // Publish updated realview even on fail (win=0).
            setTimeout(
                () => scheduleCreditAndBroadcast(req.user.userId, 0, req.app),
                CREDIT_DELAY_MS
            );

            return sendUserResponse(res, "", user, {
                multi: 0,
                lastWin: 0,
                combo: 0,
            });
        }


        // success

        state.successCount += 1;

        const index = state.successCount - 1;

        state.currentMultiplier =
            index < multiTable.length
                ? multiTable[index]
                : 0.0;

        state.totalSum += state.currentMultiplier;

        // if reached target → ready for final

        if (state.totalSum >= TARGET_SUM) {
            state.ready = true;
        }

        let win =
            Math.round(
                state.bet * state.currentMultiplier * 100
            ) / 100;

        user.balance += win;

        user.totalhistory.push({
            amount: win,
            date: new Date(),
            type: "tapcrash",
        });

        await setState(userId, {
            bet: state.bet,
            successCount: state.successCount,
            currentMultiplier: state.currentMultiplier,
            totalSum: state.totalSum,
            ready: state.ready,
        });

        await user.save();

        await CocoView.create({
            userId: req.user.userId,
            bet: state.bet,
            win,
            isUser: req.user.partnerLevel > 0 ? 1 : 0,
        });

        setTimeout(
            () => scheduleCreditAndBroadcast(req.user.userId, win, req.app),
            CREDIT_DELAY_MS
        );

        return sendUserResponse(res, "", user, {
            multi: state.currentMultiplier,
            lastWin: win,
            combo: state.successCount,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * POST /restart
 * Clears current game state so the next smash starts a new round.
 */
export const restart = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await clearState(userId);

        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
            }
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return sendUserResponse(res, "", user);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getCocoView = async (req, res) => {
    try {
        const views = await CocoView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichCocoViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


async function enrichCocoViewsWithUser(cocoViews) {
    return Promise.all(
        cocoViews.map(async (item) => {
            const user = await User.findOne(
                { userId: item.userId },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    country: 0,
                    pumpingMode: 0,
                    rubicMode: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    canWithdraw: 0,
                });
            const obj = item.toObject();
            delete obj.isUser;
            // delete obj.totalBet;
            // delete obj.totalWin;
            // delete obj.pumpingBalance;
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