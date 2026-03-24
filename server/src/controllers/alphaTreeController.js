import User from "../models/User.js";
import AlphaTreeState from "../models/AlphaTreeState.js";
import AlphaTreeView from "../models/AlphaTreeView.js";
import { sendUserResponse } from "../utils/responses.js";
import {
    VIEW_LIMIT,
    enrichAlphaTreeViewsWithUser,
    publishAlphaTreeViewFeed,
} from "../services/alphaTree/alphaTreeViewFeed.js";
import {
    ALPHA_TREE_STEP_LETTERS,
    allowedLettersForStep,
} from "../constants/alphaTreeSteps.js";
import {
    getAlphaTreeSettingsMerged,
    updateAlphaTreeSettings,
} from "../services/alphaTree/alphaTreeSettings.service.js";

const MIN_BET = 0.1;
const MAX_BET = 20;
const BASE_MULTIPLIER = 0.6;
const EASY_BUST_REROLL_CHANCE = 0.18;
const MID_POW_EASY = 0.78;
const MID_POW_HARD = 1.28;
const HIGH_STRETCH_EASY = 1.065;
const HIGH_STRETCH_HARD = 0.935;
const HIGH_STRETCH_NORMAL = 1;
const STEP10_MULT_EASY = 1.02;
const STEP10_MULT_HARD = 0.98;
const EPS = 1e-10;
/** Mid band draws in the open interval (MID_BAND_LO, MID_BAND_HI), not (0, 1). */
const MID_BAND_LO = 0.1;
const MID_BAND_HI = 1;

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/** 0 = easy, 1 = normal, 2 = hard — matches admin `alphaTreeMode` */
function normalizeAlphaTreeMode(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 1;
    if (n < 0) return 0;
    if (n > 2) return 2;
    return n;
}

/** Same rule as Coco: netProfit = total profit − total bet from game history; adjust mode at extremes only. */
function updateAlphaTreeModeByTotalProfit(user) {
    const history = Array.isArray(user?.alphaTreeHistory) ? user.alphaTreeHistory : [];
    const totalProfit = history.reduce((acc, item) => {
        const p = Number(item?.profit);
        return acc + (Number.isFinite(p) ? p : 0);
    }, 0);
    const totalBet = history.reduce((acc, item) => {
        const b = Number(item?.betAmount);
        return acc + (Number.isFinite(b) ? b : 0);
    }, 0);
    const netProfit = totalProfit - totalBet;
    if (netProfit > 100) user.alphaTreeMode = 2;
    else if (netProfit < -10) user.alphaTreeMode = 0;
}

/** Step k ∈ [2..10]: max multiplier for the “high” band (1, max) */
function maxForRandomStep(stepIndex) {
    return BASE_MULTIPLIER * Math.pow(2, stepIndex - 1);
}

/** Step 10 only: fixed base × 2^9, tuned by mode from settings */
function step10FixedMultiplier(mode) {
    const m = normalizeAlphaTreeMode(mode);
    const raw = BASE_MULTIPLIER * Math.pow(2, 9);
    const mult = m === 0 ? STEP10_MULT_EASY : m === 2 ? STEP10_MULT_HARD : 1;
    return round2(raw * mult);
}

/**
 * Create band assignment for 3 buttons of a step (steps 2–9).
 * Each button is independent:
 *  - "high" with probability = settings.highBandRate  -> (1, max)
 *  - remaining split equally:
 *      - "mid"  with probability = (1-highBandRate)/2 -> (0.1, 1)
 *      - "zero" with probability = (1-highBandRate)/2 -> bust (0)
 */
function randomBandPermutation(settings) {
    const hb = Number(settings?.highBandRate);
    const highBandRate = Number.isFinite(hb) ? Math.min(1, Math.max(0, hb)) : 1 / 3;
    const midZeroRate = (1 - highBandRate) / 2;

    const drawBand = () => {
        const u = Math.random();
        if (u < highBandRate) return "high";
        if (u < highBandRate + midZeroRate) return "mid";
        return "zero";
    };

    return [drawBand(), drawBand(), drawBand()];
}

/**
 * Draw multiplier for step stepIndex given band kind (from permutation).
 * zero → 0 | mid → (0.1, 1) | high → (1, max)
 * Mode skews mid/high draws: easy → more favorable, hard → less.
 */
function drawMidInBand(mode) {
    const m = normalizeAlphaTreeMode(mode);
    const width = MID_BAND_HI - MID_BAND_LO - 2 * EPS;
    let u;
    if (m === 0) {
        u = Math.pow(Math.random(), MID_POW_EASY);
    } else if (m === 2) {
        u = Math.pow(Math.random(), MID_POW_HARD);
    } else {
        u = Math.random();
    }
    return MID_BAND_LO + EPS + u * width;
}

function drawForBand(stepIndex, band, mode) {
    const m = normalizeAlphaTreeMode(mode);
    const max = maxForRandomStep(stepIndex);
    if (band === "zero") {
        return 0;
    }
    if (band === "mid") {
        return drawMidInBand(mode);
    }
    const hi = Math.max(max, 1 + 3 * EPS);
    let r = 1 + EPS + Math.random() * (hi - 1 - 2 * EPS);
    if (m === 0) {
        r = 1 + (r - 1) * HIGH_STRETCH_EASY;
        r = Math.min(r, hi);
    } else if (m === 2) {
        r = 1 + (r - 1) * HIGH_STRETCH_HARD;
    } else if (m === 1) {
        r = 1 + (r - 1) * HIGH_STRETCH_NORMAL;
        r = Math.min(r, hi);
    }
    return r;
}

async function broadcastAlphaTreeView(req) {
    await publishAlphaTreeViewFeed(req.app?.locals?.ably);
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

/**
 * POST /api/alpha-tree/start
 * Deducts bet and creates state: step 1, must click A next.
 */
export const startGame = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const betAmount = round2(Number(req.body?.betAmount ?? 0));
        if (!Number.isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
            return res.status(400).json({
                error: "Invalid bet amount",
                message: `Bet must be between ${MIN_BET} and ${MAX_BET}`,
            });
        }

        const existing = await AlphaTreeState.findOne({ userId });
        if (existing) {
            return res.status(400).json({
                error: "Game already in progress",
                message: "Finish the round, cash out, or bust before starting a new game",
            });
        }

        const user = await loadUser(req);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const balance = Number(user.balance ?? 0);
        if (balance < betAmount) {
            return res.status(400).json({
                error: "Insufficient balance",
                message: "Insufficient balance",
            });
        }

        user.balance = round2(balance - betAmount);
        user.totalhistory = user.totalhistory || [];
        user.totalhistory.push({
            amount: -betAmount,
            date: new Date(),
            type: "alphatree",
        });

        await AlphaTreeState.create({
            userId,
            betAmount,
            cumulativeMultiplier: 1,
            step: 1,
            phase: "await_a",
            active: true,
        });

        await user.save();

        const state = await AlphaTreeState.findOne({ userId }).lean();
        return sendUserResponse(res, "", user, {
            alphaTree: formatState(state),
        });
    } catch (error) {
        console.error("[alphaTree] startGame", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/alpha-tree/pick
 * body: { letter } — steps 2–9: random assignment of bust / (0.1,1) / (1,max) to the 3 letters. Step 10: Z, fixed base×2^9.
 */
export const pickLetter = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const letter = String(req.body?.letter ?? "")
            .trim()
            .toUpperCase();
        if (!/^[A-Z]$/.test(letter)) {
            return res.status(400).json({ error: "Invalid letter" });
        }

        const state = await AlphaTreeState.findOne({ userId });
        if (!state || !state.active) {
            return res.status(400).json({ error: "No active game" });
        }

        if (state.phase === "await_cashout") {
            return res.status(400).json({
                error: "Use cash out",
                message: "Round complete — cash out to collect",
            });
        }

        const user = await loadUser(req);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const settings = await getAlphaTreeSettingsMerged();

        // Step 1: only A → fixed base multiplier from settings
        if (state.phase === "await_a") {
            if (letter !== "A") {
                return res.status(400).json({
                    error: "Invalid move",
                    message: "First step: press A only",
                });
            }
            const baseMult = BASE_MULTIPLIER;
            state.cumulativeMultiplier = round2(state.cumulativeMultiplier * baseMult);
            state.step = 2;
            state.phase = "playing";
            state.bandPermutation = randomBandPermutation(settings);
            await state.save();

            return sendUserResponse(res, "", user, {
                alphaTree: formatState(state.toObject()),
                lastDraw: {
                    step: 1,
                    value: baseMult,
                    kind: "fixed_a",
                    letter: "A",
                    letterResults: { A: baseMult },
                },
            });
        }

        // Steps 2–10: letter must match this step’s group (same RNG for any valid letter)
        if (state.phase !== "playing" || state.step < 2 || state.step > 10) {
            return res.status(400).json({ error: "Invalid game state" });
        }

        const allowed = ALPHA_TREE_STEP_LETTERS[state.step - 1] || [];
        if (!allowed.includes(letter)) {
            return res.status(400).json({
                error: "Invalid letter for this step",
                message: `Allowed: ${allowed.join(", ")}`,
                allowed,
            });
        }

        const letterIndex = allowed.indexOf(letter);
        const stepIndex = state.step;

        // Step 10: only Z — fixed base × 2^9 (no band permutation)
        if (stepIndex === 10) {
            const mode = normalizeAlphaTreeMode(user.alphaTreeMode);
            const r = step10FixedMultiplier(mode);
            state.cumulativeMultiplier = round2(state.cumulativeMultiplier * r);
            state.step = 11;
            state.phase = "await_cashout";
            state.bandPermutation = undefined;
            await state.save();

            return sendUserResponse(res, "", user, {
                alphaTree: formatState(state.toObject()),
                lastDraw: {
                    step: 10,
                    value: r,
                    kind: "fixed_z",
                    band: "fixed",
                    busted: false,
                    letter: "Z",
                    letterResults: { Z: r },
                },
            });
        }

        // Steps 2–9: each letter gets one of {bust, (0.1,1), (1,max)} — random permutation per step
        let perm = state.bandPermutation;
        if (!perm || perm.length !== 3) {
            perm = randomBandPermutation(settings);
            state.bandPermutation = perm;
        }
        const mode = normalizeAlphaTreeMode(user.alphaTreeMode);
        let band = perm[letterIndex];
        if (mode === 0 && band === "zero" && Math.random() < EASY_BUST_REROLL_CHANCE) {
            perm = randomBandPermutation(settings);
            state.bandPermutation = perm;
            band = perm[letterIndex];
        }

        /** All three outcomes this step (same permutation; independent draws per band). */
        const letterResults = {};
        for (let i = 0; i < 3; i++) {
            const b = perm[i];
            letterResults[allowed[i]] =
                Math.round(drawForBand(stepIndex, b, mode) * 1e8) / 1e8;
        }

        const r = letterResults[letter];

        if (r <= EPS) {
            const lostBet = state.betAmount;
            const viewUserId = req.user?.userId || userId;

            await AlphaTreeState.deleteOne({ userId });

            user.alphaTreeHistory = user.alphaTreeHistory || [];
            user.alphaTreeHistory.push({
                betAmount: lostBet,
                totalMultiplier: 0,
                profit: 0,
                busted: true,
                createAt: new Date(),
            });

            updateAlphaTreeModeByTotalProfit(user);

            await AlphaTreeView.create({
                userId: viewUserId,
                bet: lostBet,
                win: 0,
                result: 0,
                isUser: Number(req.user?.partnerLevel) > 0 ? 1 : 0,
            });

            await user.save();

            setTimeout(() => {
                broadcastAlphaTreeView(req);
            }, 3000);

            return sendUserResponse(res, "", user, {
                alphaTree: null,
                lastDraw: {
                    step: stepIndex,
                    value: r,
                    band: "zero",
                    busted: true,
                    lostBet,
                    letter,
                    letterResults,
                },
            });
        }

        state.cumulativeMultiplier = round2(state.cumulativeMultiplier * r);
        state.step = stepIndex + 1;
        if (state.step >= 2 && state.step <= 9) {
            state.bandPermutation = randomBandPermutation(settings);
        } else {
            state.bandPermutation = undefined;
        }

        await state.save();

        return sendUserResponse(res, "", user, {
            alphaTree: formatState(state.toObject()),
            lastDraw: {
                step: stepIndex,
                value: r,
                band,
                busted: false,
                letter,
                letterResults,
            },
        });
    } catch (error) {
        console.error("[alphaTree] pickLetter", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/alpha-tree/cashout
 */
export const cashOut = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const state = await AlphaTreeState.findOne({ userId });
        if (!state || !state.active) {
            return res.status(400).json({ error: "No active game" });
        }

        // Cash out any time after step 1 is done (playing, step ≥ 2), or after final step (await_cashout).
        if (state.phase === "await_a") {
            return res.status(400).json({
                error: "Cannot cash out yet",
                message: "Complete step 1 first",
            });
        }
        if (state.phase !== "playing" && state.phase !== "await_cashout") {
            return res.status(400).json({ error: "Invalid game state" });
        }

        const user = await loadUser(req);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const win = round2(state.betAmount * state.cumulativeMultiplier);
        const totalMultiplier = state.cumulativeMultiplier;
        const betAmount = state.betAmount;
        const viewUserId = req.user?.userId || userId;

        user.balance = round2(Number(user.balance ?? 0) + win);
        user.totalhistory = user.totalhistory || [];
        user.totalhistory.push({
            amount: win,
            date: new Date(),
            type: "alphatree",
        });
        user.alphaTreeHistory = user.alphaTreeHistory || [];
        user.alphaTreeHistory.push({
            betAmount,
            totalMultiplier,
            profit: win,
            busted: false,
            createAt: new Date(),
        });

        updateAlphaTreeModeByTotalProfit(user);

        await AlphaTreeView.create({
            userId: viewUserId,
            bet: betAmount,
            win,
            result: totalMultiplier,
            isUser: Number(req.user?.partnerLevel) > 0 ? 1 : 0,
        });

        await state.deleteOne();
        await user.save();

        setTimeout(() => {
            broadcastAlphaTreeView(req);
        }, 3000);

        return sendUserResponse(res, "", user, {
            alphaTree: null,
            cashout: { win, totalMultiplier },
        });
    } catch (error) {
        console.error("[alphaTree] cashOut", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/alpha-tree/state
 */
export const getState = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const [state, userLean, settings] = await Promise.all([
            AlphaTreeState.findOne({ userId }).lean(),
            User.findOne({ userAuthId: req.user.userAuthId })
                .select("alphaTreeMode")
                .lean(),
            getAlphaTreeSettingsMerged(),
        ]);
        const alphaTreeMode = normalizeAlphaTreeMode(userLean?.alphaTreeMode);
        return res.json({
            alphaTree: state ? formatState(state) : null,
            alphaTreeMode,
            baseMultiplier: round2(BASE_MULTIPLIER),
            settings: {
                highBandRate: Number(settings.highBandRate),
            },
        });
    } catch (error) {
        console.error("[alphaTree] getState", error);
        return res.status(500).json({ error: error.message });
    }
};

function formatState(doc) {
    if (!doc) return null;
    return {
        betAmount: doc.betAmount,
        cumulativeMultiplier: doc.cumulativeMultiplier,
        step: doc.step,
        phase: doc.phase,
        active: doc.active,
        /** UI base multiplier stays fixed in game logic. */
        baseMultiplier: round2(BASE_MULTIPLIER),
        allowedLetters: allowedLettersForStep(doc.step, doc.phase),
        /** True when the player may collect (after step 1, or after all 10 steps). */
        canCashOut: doc.phase === "playing" || doc.phase === "await_cashout",
        /** Max for high band (steps 2–9) or fixed step-10 rate (base×2^(step−1)) */
        nextRandomMax:
            doc.phase === "playing" && doc.step >= 2 && doc.step <= 10
                ? round2(maxForRandomStep(doc.step))
                : null,
    };
}

export const getAlphaTreeView = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.userAuthId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const views = await AlphaTreeView.find()
            .sort({ createdAt: -1 })
            .limit(VIEW_LIMIT);
        const data = await enrichAlphaTreeViewsWithUser(views); 
        return res.status(200).json({ data });
    } catch (error) {
        console.error("[alphaTree] getAlphaTreeView", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/alpha-tree/settings
 */
export const getSettings = async (_req, res) => {
    try {
        const settings = await getAlphaTreeSettingsMerged();
        return res.status(200).json({ settings });
    } catch (error) {
        console.error("[alphaTree] getSettings", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * PUT /api/alpha-tree/settings
 */
export const putSettings = async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const settings = await updateAlphaTreeSettings(body);
        return res.status(200).json({ settings });
    } catch (error) {
        console.error("[alphaTree] putSettings", error);
        return res.status(500).json({ error: error.message });
    }
};
