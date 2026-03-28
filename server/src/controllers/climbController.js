import User from "../models/User.js";
import ClimbState from "../models/ClimbState.js";
import ClimbView from "../models/ClimbView.js";
import { sendUserResponse } from "../utils/responses.js";
import { getClimbSettingsMerged, normalizeClimbViewResult } from "../services/climb/climbSettings.service.js";
import {
    enrichClimbViewsWithUser,
    CLIMB_VIEW_LIMIT,
    publishClimbViewFeed,
} from "../services/climb/climbViewFeed.js";

const MIN_BET = 0.1;
const MAX_BET = 20;
const MODE_TO_COLS = { easy: 5, normal: 3, hard: 2 };
/** Per-user `climbMode` on User: bust probability for each pick (round grid/mode is separate). */
const BAN_RATE_CLIMB_MODE_0 = 0.1;
const BAN_RATE_CLIMB_MODE_2 = 0.8;
/** Lifetime climb net from `climbHistory` → auto `climbMode` (ban tier). */
const CLIMB_PROFIT_SYNC_HARD_AT = 100;
const CLIMB_PROFIT_SYNC_EASY_AT = -100;

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/** Round / UI difficulty: grid columns & step multipliers (from client on Play). */
function normalizeMode(raw) {
    const m = String(raw || "").toLowerCase();
    if (m === "easy" || m === "normal" || m === "hard") return m;
    return "easy";
}

/** Net P/L on Climb from history (payout − bet per round; bust ⇒ −bet). */
function climbNetProfitTotal(user) {
    const hist = user.climbHistory || [];
    let sum = 0;
    for (const h of hist) {
        const bet = Number(h.betAmount ?? 0);
        if (h.busted) {
            sum -= bet;
        } else {
            const payout = Number(h.profit ?? 0);
            sum += payout - bet;
        }
    }
    return sum;
}

/**
 * `climbMode` 2 if net profit > 100, 0 if net < −100, else 1.
 * Independent of round Easy/Normal/Hard grid; only affects ban rate tier.
 */
function syncClimbModeFromNetProfit(user) {
    const net = climbNetProfitTotal(user);
    if (net > CLIMB_PROFIT_SYNC_HARD_AT) {
        user.climbMode = 2;
    } else if (net < CLIMB_PROFIT_SYNC_EASY_AT) {
        user.climbMode = 0;
    } else {
        user.climbMode = 1;
    }
}

/** `user.climbMode`: 0 → 0.1, 2 → 0.8; 1 uses merged `normal.banRate` / fallback. */
function banRateFromClimbMode(climbModeNum, cols, mergedSettings) {
    const raw = Number(climbModeNum);
    const m = Number.isFinite(raw) ? Math.min(2, Math.max(0, raw)) : 1;
    if (m === 0) {
        return BAN_RATE_CLIMB_MODE_0;
    }
    if (m === 2) {
        return BAN_RATE_CLIMB_MODE_2;
    }
    const ns = mergedSettings.normal || mergedSettings.easy;
    return Math.min(1, Math.max(0, Number(ns.banRate ?? 1 / cols)));
}

async function loadUser(req) {
    return User.findOne(
        { userAuthId: req.user.userAuthId },
        {
            "wallets.eth.privateKey": 0,
            "wallets.bsc.privateKey": 0,
            "wallets.tron.privateKey": 0,
            password: 0,
            country: 0,
        }
    );
}

function formatState(state) {
    if (!state) return null;
    return {
        mode: state.mode,
        betAmount: state.betAmount,
        activeRow: state.activeRow,
        successCount: state.successCount,
        currentMultiplier: state.currentMultiplier,
        canCashOut: state.successCount > 0 && state.active,
        active: !!state.active,
    };
}

/** Credit user and record history for a successful climb (same rules as cash out). */
function settleActiveClimbWin(state, user) {
    const totalMultiplier = state.currentMultiplier;
    const win = round2(Number(state.betAmount) * Number(totalMultiplier));
    user.balance = round2(Number(user.balance ?? 0) + win);
    user.totalhistory = user.totalhistory || [];
    user.totalhistory.push({
        amount: win,
        date: new Date(),
        type: "climb",
    });
    user.climbHistory = user.climbHistory || [];
    user.climbHistory.push({
        betAmount: state.betAmount,
        totalMultiplier,
        profit: win,
        busted: false,
        createAt: new Date(),
    });
    syncClimbModeFromNetProfit(user);
    return { win, totalMultiplier };
}

async function recordClimbViewRow(req, { userId, bet, win, result, mode, isUser = 1 }) {
    try {
        const merged = await getClimbSettingsMerged();
        const resultNorm = normalizeClimbViewResult(mode, result, merged);
        await ClimbView.create({
            userId,
            bet: round2(Number(bet)),
            win: round2(Number(win)),
            result: resultNorm,
            mode: normalizeMode(mode),
            symbol: "climb",
            isUser,
            time: new Date(),
        });
        publishClimbViewFeed(req.app?.locals?.ably).catch((err) => {
            console.error("[climb] publishClimbViewFeed", err);
        });
    } catch (e) {
        console.error("[climb] recordClimbViewRow", e);
    }
}

export const getClimbView = async (_req, res) => {
    try {
        const views = await ClimbView.find().sort({ createdAt: -1 }).limit(CLIMB_VIEW_LIMIT);
        const data = await enrichClimbViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("[climb] getClimbView", error);
        return res.status(500).json({ error: error.message });
    }
};

export const startGame = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const betAmount = round2(Number(req.body?.betAmount ?? 0));
        if (!Number.isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
            return res.status(400).json({
                error: "Invalid bet amount",
                message: `Bet must be between ${MIN_BET} and ${MAX_BET}`,
            });
        }

        const existing = await ClimbState.findOne({ userId });
        if (existing) {
            return res.status(400).json({
                error: "Game already in progress",
                message: "Finish current round before starting a new one",
            });
        }

        const user = await loadUser(req);
        if (!user) return res.status(404).json({ error: "User not found" });

        const balance = Number(user.balance ?? 0);
        if (balance < betAmount) {
            return res.status(400).json({ error: "Insufficient balance", message: "Insufficient balance" });
        }

        user.balance = round2(balance - betAmount);
        user.totalBet = Number(user.totalBet ?? 0) + betAmount;
        user.refreshBet = Number(user.refreshBet ?? 0) + betAmount;
        user.lotterybet = Number(user.lotterybet ?? 0) + betAmount;
        user.totalhistory = user.totalhistory || [];
        user.totalhistory.push({
            amount: -betAmount,
            date: new Date(),
            type: "climb",
        });
        const mode = normalizeMode(req.body?.mode);
        syncClimbModeFromNetProfit(user);

        await ClimbState.create({
            userId,
            betAmount,
            mode,
            activeRow: 4,
            successCount: 0,
            currentMultiplier: 1,
            active: true,
        });
        await user.save();

        const state = await ClimbState.findOne({ userId }).lean();
        return sendUserResponse(res, "", user, {
            climb: formatState(state),
        });
    } catch (error) {
        console.error("[climb] startGame", error);
        return res.status(500).json({ error: error.message });
    }
};

export const pickBox = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const colIndex = Number(req.body?.colIndex);
        if (!Number.isInteger(colIndex) || colIndex < 0) {
            return res.status(400).json({ error: "Invalid column index" });
        }

        const state = await ClimbState.findOne({ userId });
        if (!state || !state.active) return res.status(400).json({ error: "No active game" });

        const cols = MODE_TO_COLS[state.mode] || 5;
        if (colIndex >= cols) return res.status(400).json({ error: "Invalid column for current mode" });
        if (state.activeRow < 0) return res.status(400).json({ error: "Round already cleared. Cash out." });

        const user = await loadUser(req);
        if (!user) return res.status(404).json({ error: "User not found" });

        const settings = await getClimbSettingsMerged();
        const gameModeSettings = settings[state.mode] || settings.easy;
        const banRate = banRateFromClimbMode(user.climbMode, cols, settings);

        if (Math.random() < banRate) {
            user.climbHistory = user.climbHistory || [];
            user.climbHistory.push({
                betAmount: state.betAmount,
                totalMultiplier: 0,
                profit: 0,
                busted: true,
                createAt: new Date(),
            });
            syncClimbModeFromNetProfit(user);
            await Promise.all([state.deleteOne(), user.save()]);
            await recordClimbViewRow(req, {
                userId,
                bet: state.betAmount,
                win: 0,
                result: 0,
                mode: state.mode,
                isUser: 1,
            });
            return sendUserResponse(res, "", user, {
                climb: null,
                lastPick: {
                    row: state.activeRow,
                    col: colIndex,
                    result: "ban",
                    busted: true,
                },
            });
        }

        const nextSuccessCount = state.successCount + 1;
        const nextMultiplier = Number(
            gameModeSettings.multipliers?.[nextSuccessCount - 1] ?? state.currentMultiplier
        );
        state.successCount = nextSuccessCount;
        state.currentMultiplier = nextMultiplier;
        state.activeRow = state.activeRow - 1;

        if (state.activeRow < 0) {
            const lastPickRow = state.activeRow + 1;
            const { win, totalMultiplier } = settleActiveClimbWin(state, user);
            await Promise.all([state.deleteOne(), user.save()]);
            await recordClimbViewRow(req, {
                userId,
                bet: state.betAmount,
                win,
                result: totalMultiplier,
                mode: state.mode,
                isUser: 1,
            });
            return sendUserResponse(res, "", user, {
                climb: null,
                lastPick: {
                    row: lastPickRow,
                    col: colIndex,
                    result: "star",
                    busted: false,
                    multiplier: totalMultiplier,
                },
                cashout: {
                    win,
                    totalMultiplier,
                },
            });
        }

        await state.save();

        return sendUserResponse(res, "", user, {
            climb: formatState(state.toObject()),
            lastPick: {
                row: state.activeRow + 1,
                col: colIndex,
                result: "star",
                busted: false,
                multiplier: nextMultiplier,
            },
        });
    } catch (error) {
        console.error("[climb] pickBox", error);
        return res.status(500).json({ error: error.message });
    }
};

export const cashOut = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const state = await ClimbState.findOne({ userId });
        if (!state || !state.active) return res.status(400).json({ error: "No active game" });
        if (state.successCount <= 0) {
            return res.status(400).json({ error: "Cannot cash out yet", message: "Pick at least one star first" });
        }

        const user = await loadUser(req);
        if (!user) return res.status(404).json({ error: "User not found" });

        const { win, totalMultiplier } = settleActiveClimbWin(state, user);

        await Promise.all([state.deleteOne(), user.save()]);

        await recordClimbViewRow(req, {
            userId,
            bet: state.betAmount,
            win,
            result: totalMultiplier,
            mode: state.mode,
            isUser: 1,
        });

        return sendUserResponse(res, "", user, {
            climb: null,
            cashout: {
                win,
                totalMultiplier,
            },
        });
    } catch (error) {
        console.error("[climb] cashOut", error);
        return res.status(500).json({ error: error.message });
    }
};

export const getState = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const state = await ClimbState.findOne({ userId }).lean();
        return res.json({ climb: formatState(state) });
    } catch (error) {
        console.error("[climb] getState", error);
        return res.status(500).json({ error: error.message });
    }
};

