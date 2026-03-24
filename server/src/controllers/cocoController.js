import User from "../models/User.js";
import { sendUserResponse } from "../utils/responses.js";
import CocoView from "../models/CocoView.js";
import CocoState from "../models/CocoState.js";
import CocoRate from "../models/CocoRate.js";

const CREDIT_DELAY_MS = 300;
const VIEW_LIMIT = 22;
const USER_HISTORY_CAP = 200;
const multiTable = [
    0.5,
    1.05,
    1.2,
    1.35,
    1.5,
    2.0,
];

const TARGET_SUM = 6;
const RATE_CACHE_TTL_MS = 30 * 1000;

const rand = (min, max) => min + Math.random() * (max - min);

// Fallback success-rate formula per cocoMode.
// If DB table doesn't have data for the selected mode, we use these.
const COCO_MODE_SUCCESS_CONFIG = {
    0: { base: 0.7, dropPerCombo: 0.08, min: 0.25 }, // easy
    1: { base: 0.65, dropPerCombo: 0.1, min: 0.22 }, // normal
    2: { base: 0.6, dropPerCombo: 0.12, min: 0.18 }, // hard
};

function getFallbackCocoSuccessRateByCombo(combo, cocoMode) {
    const safeCombo = Number.isFinite(combo) ? Math.max(0, combo) : 0;
    const mode = Number.isFinite(cocoMode) ? cocoMode : 0;
    const cfg = COCO_MODE_SUCCESS_CONFIG[mode] || COCO_MODE_SUCCESS_CONFIG[0];
    return Math.max(cfg.min, cfg.base - safeCombo * cfg.dropPerCombo);
}

function normalizeRate(rate) {
    const num = Number(rate);
    if (!Number.isFinite(num)) return null;
    // Allow either decimal (0.7) or percent (70) from DB input habits.
    const decimal = num > 1 ? num / 100 : num;
    return Math.max(0, Math.min(1, decimal));
}

function pushWithCap(arr, value, cap = USER_HISTORY_CAP) {
    const list = Array.isArray(arr) ? arr : [];
    list.push(value);
    if (list.length > cap) {
        list.splice(0, list.length - cap);
    }
    return list;
}

function getRateFieldForMode(cocoMode) {
    const mode = Number.isFinite(cocoMode) ? cocoMode : 0;
    if (mode === 0) return "easyRate";
    if (mode === 1) return "normalRate";
    if (mode === 2) return "hardRate";
    return "easyRate";
}

function warmCocoTotalsFromHistory(user) {
    const history = Array.isArray(user?.cocoHistory) ? user.cocoHistory : [];
    const totalProfit = history.reduce((acc, item) => {
        const p = Number(item?.profit);
        return acc + (Number.isFinite(p) ? p : 0);
    }, 0);
    const totalBet = history.reduce((acc, item) => {
        const b = Number(item?.betAmount);
        return acc + (Number.isFinite(b) ? b : 0);
    }, 0);
    user.cocoTotalProfit = totalProfit;
    user.cocoTotalBet = totalBet;
}

function applyCocoResultAndUpdateMode(user, betAmount, profitAmount) {
    if (
        !Number.isFinite(Number(user?.cocoTotalProfit)) ||
        !Number.isFinite(Number(user?.cocoTotalBet))
    ) {
        warmCocoTotalsFromHistory(user);
    }

    const safeBet = Number.isFinite(Number(betAmount)) ? Number(betAmount) : 0;
    const safeProfit = Number.isFinite(Number(profitAmount)) ? Number(profitAmount) : 0;
    user.cocoTotalProfit = Number(user.cocoTotalProfit || 0) + safeProfit;
    user.cocoTotalBet = Number(user.cocoTotalBet || 0) + safeBet;

    const netProfit = user.cocoTotalProfit - user.cocoTotalBet;

    // Mode changes only at extremes; otherwise keep current mode.
    if (netProfit > 100) user.cocoMode = 2;
    else if (netProfit < -10) user.cocoMode = 0;
}

let cocoRateCache = null;
let cocoRateCacheAt = 0;
let cocoRateCachePromise = null;

async function getCocoRateRows() {
    const now = Date.now();
    if (cocoRateCache && now - cocoRateCacheAt < RATE_CACHE_TTL_MS) {
        return cocoRateCache;
    }
    if (cocoRateCachePromise) {
        return cocoRateCachePromise;
    }

    cocoRateCachePromise = CocoRate.find(
        {},
        { successCount: 1, rate: 1, easyRate: 1, normalRate: 1, hardRate: 1 }
    )
        .sort({ successCount: 1 })
        .lean()
        .then((rows) => {
            cocoRateCache = rows;
            cocoRateCacheAt = Date.now();
            return rows;
        })
        .finally(() => {
            cocoRateCachePromise = null;
        });

    return cocoRateCachePromise;
}

async function getCocoSuccessRateByCombo(combo, cocoMode) {
    const safeCombo = Number.isFinite(combo) ? Math.max(0, combo) : 0;
    const rows = await getCocoRateRows();
    const field = getRateFieldForMode(cocoMode);
    let nearest = null;
    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (row.successCount === safeCombo) {
            const exactRate = normalizeRate(row?.[field]) ?? normalizeRate(row?.rate);
            if (exactRate !== null && exactRate !== undefined) return exactRate;
            nearest = row;
            break;
        }
        if (row.successCount < safeCombo) {
            nearest = row;
            continue;
        }
        break;
    }

    const nearestRate = normalizeRate(nearest?.[field]) ?? normalizeRate(nearest?.rate);
    if (nearestRate !== null && nearestRate !== undefined) return nearestRate;

    // Final fallback keeps current behavior if no DB table rows exist yet.
    return getFallbackCocoSuccessRateByCombo(safeCombo, cocoMode);
}

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
            user.totalhistory = pushWithCap(user.totalhistory, {
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

            // Store the result snapshot for this smash.
            user.cocoHistory = pushWithCap(user.cocoHistory, {
                betAmount: state.bet,
                result: finalMulti,
                profit: win,
                multiplier: finalMulti,
                successCount: state.successCount,
                totalSum: state.totalSum,
            });

            applyCocoResultAndUpdateMode(user, state.bet, win);

            user.totalhistory = pushWithCap(user.totalhistory, {
                amount: win,
                date: new Date(),
                type: "tapcrash",
            });

            await Promise.all([
                clearState(userId),
                user.save(),
                CocoView.create({
                userId: req.user.userId,
                bet: state.bet,
                win,
                result: finalMulti,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
                }),
            ]);

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


        const cocoMode = Number(user?.cocoMode ?? 0);
        const successRate = await getCocoSuccessRateByCombo(
            state.successCount,
            cocoMode
        );
        const success = Math.random() < successRate;

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

            // Store the result snapshot for this (failed) smash.
            user.cocoHistory = pushWithCap(user.cocoHistory, {
                betAmount: state.bet,
                result: 0,
                profit: 0,
                multiplier: 0,
                successCount: state.successCount,
                totalSum: state.totalSum,
            });

            applyCocoResultAndUpdateMode(user, state.bet, 0);

            await Promise.all([
                user.save(),
                CocoView.create({
                userId: req.user.userId,
                bet: state.bet,
                win: 0,
                result: 0,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
                }),
            ]);

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

        // Store the result snapshot for this (successful step) smash.
        user.cocoHistory = pushWithCap(user.cocoHistory, {
            betAmount: state.bet,
            result: state.currentMultiplier,
            profit: win,
            multiplier: state.currentMultiplier,
            successCount: state.successCount,
            totalSum: state.totalSum,
        });

        applyCocoResultAndUpdateMode(user, state.bet, win);

        user.totalhistory = pushWithCap(user.totalhistory, {
            amount: win,
            date: new Date(),
            type: "tapcrash",
        });

        await Promise.all([
            setState(userId, {
                bet: state.bet,
                successCount: state.successCount,
                currentMultiplier: state.currentMultiplier,
                totalSum: state.totalSum,
                ready: state.ready,
            }),
            user.save(),
            CocoView.create({
                userId: req.user.userId,
                bet: state.bet,
                win,
                result: state.currentMultiplier,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
            }),
        ]);

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