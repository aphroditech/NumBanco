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
/** If cumulative multiplier exceeds this before a pick (steps 2–10), the next result is forced to bust (0). */
const MAX_CUMULATIVE_BEFORE_FORCED_BUST = 10;
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
 * P(the letter the user clicked gets the high band) for steps 2–9.
 * Uses `chosenLetterHighRate` when set; otherwise `highBandRate` (default ~1/3).
 */
function getChosenLetterHighProbability(settings) {
    const c = Number(settings?.chosenLetterHighRate);
    if (Number.isFinite(c)) {
        return Math.min(1, Math.max(0, c));
    }
    const hb = Number(settings?.highBandRate);
    if (Number.isFinite(hb)) {
        return Math.min(1, Math.max(0, hb));
    }
    return 1 / 3;
}

/**
 * Assign zero / mid / high to the three letters of this step: each band exactly once.
 * The clicked letter gets "high" with probability `pChosenHigh`; otherwise high goes to one of the other two (50/50).
 */
function assignBandsForThreeLetters(chosenLetter, allowed, pChosenHigh) {
    if (allowed.length !== 3) {
        throw new Error("assignBandsForThreeLetters: expected 3 letters");
    }
    const p = Math.min(1, Math.max(0, pChosenHigh));
    const others = allowed.filter((L) => L !== chosenLetter);
    if (others.length !== 2) {
        throw new Error("assignBandsForThreeLetters: chosen letter not in allowed");
    }
    const [o1, o2] = others;

    if (Math.random() < p) {
        const midOnFirst = Math.random() < 0.5;
        return {
            [chosenLetter]: "high",
            [o1]: midOnFirst ? "mid" : "zero",
            [o2]: midOnFirst ? "zero" : "mid",
        };
    }

    const highOnO1 = Math.random() < 0.5;
    const highLetter = highOnO1 ? o1 : o2;
    const otherNonChosen = highLetter === o1 ? o2 : o1;
    const chosenGetsZero = Math.random() < 0.5;
    return {
        [highLetter]: "high",
        [chosenLetter]: chosenGetsZero ? "zero" : "mid",
        [otherNonChosen]: chosenGetsZero ? "mid" : "zero",
    };
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

/**
 * Step 10 (Z): if `zButtonHighRate` is configured (0–1), draw high / mid / zero with
 * P(high)=rate → value in (1, max); remaining probability split evenly between mid and bust.
 * If the setting is absent, use the legacy fixed Z multiplier.
 */
function resolveStep10Draw(settings, mode) {
    const z = settings?.zButtonHighRate;
    if (z === undefined || z === null || !Number.isFinite(Number(z))) {
        return {
            r: step10FixedMultiplier(mode),
            band: "fixed",
            lastDrawKind: "fixed_z",
        };
    }
    const p = Math.min(1, Math.max(0, Number(z)));
    const u = Math.random();
    let bandKind;
    if (u < p) {
        bandKind = "high";
    } else if (u < p + (1 - p) / 2) {
        bandKind = "mid";
    } else {
        bandKind = "zero";
    }
    const r = Math.round(drawForBand(10, bandKind, mode) * 1e8) / 1e8;
    return { r, band: bandKind, lastDrawKind: null };
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

async function finishAlphaTreeBust(req, res, user, userId, state, lastDrawPartial) {
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
            ...lastDrawPartial,
            busted: true,
            lostBet,
        },
    });
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
 * body: { letter } — steps 2–9: on click, server assigns zero/mid/high to the three letters (each once),
 * with P(chosen gets high) from settings (`chosenLetterHighRate` or `highBandRate`), draws values, returns all three in `letterResults`.
 * Step 10: Z — fixed base×2^9 unless `zButtonHighRate` is set (then random high/mid/zero with that P(high)).
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
            state.bandPermutation = undefined;
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

        const stepIndex = state.step;

        const cum = Number(state.cumulativeMultiplier);
        if (Number.isFinite(cum) && cum > MAX_CUMULATIVE_BEFORE_FORCED_BUST) {
            if (stepIndex === 10) {
                return finishAlphaTreeBust(req, res, user, userId, state, {
                    step: 10,
                    value: 0,
                    band: "zero",
                    letter: "Z",
                    letterResults: { Z: 0 },
                });
            }
            const mode = normalizeAlphaTreeMode(user.alphaTreeMode);
            const others = allowed.filter((L) => L !== letter);
            const [o1, o2] = others;
            const midOnFirst = Math.random() < 0.5;
            const bandMap = {
                [letter]: "zero",
                [o1]: midOnFirst ? "mid" : "high",
                [o2]: midOnFirst ? "high" : "mid",
            };
            const letterResults = {};
            for (const L of allowed) {
                letterResults[L] =
                    Math.round(drawForBand(stepIndex, bandMap[L], mode) * 1e8) / 1e8;
            }
            const r = letterResults[letter];
            return finishAlphaTreeBust(req, res, user, userId, state, {
                step: stepIndex,
                value: r,
                band: "zero",
                letter,
                letterResults,
            });
        }

        // Step 10: only Z — legacy fixed mult, or random bands when `zButtonHighRate` is configured
        if (stepIndex === 10) {
            const mode = normalizeAlphaTreeMode(user.alphaTreeMode);
            const { r, band, lastDrawKind } = resolveStep10Draw(settings, mode);

            if (r <= EPS) {
                return finishAlphaTreeBust(req, res, user, userId, state, {
                    step: 10,
                    value: r,
                    band: "zero",
                    letter: "Z",
                    letterResults: { Z: r },
                });
            }

            state.cumulativeMultiplier = round2(state.cumulativeMultiplier * r);
            state.step = 11;
            state.phase = "await_cashout";
            state.bandPermutation = undefined;
            await state.save();

            const lastDraw = {
                step: 10,
                value: r,
                band,
                busted: false,
                letter: "Z",
                letterResults: { Z: r },
            };
            if (lastDrawKind) {
                lastDraw.kind = lastDrawKind;
            }

            return sendUserResponse(res, "", user, {
                alphaTree: formatState(state.toObject()),
                lastDraw,
            });
        }

        // Steps 2–9: full permutation of bands on the three letters; bias P(chosen → high) from settings
        const mode = normalizeAlphaTreeMode(user.alphaTreeMode);
        const pHighChosen = getChosenLetterHighProbability(settings);
        let bandMap = assignBandsForThreeLetters(letter, allowed, pHighChosen);
        if (
            mode === 0 &&
            bandMap[letter] === "zero" &&
            Math.random() < EASY_BUST_REROLL_CHANCE
        ) {
            bandMap = assignBandsForThreeLetters(letter, allowed, pHighChosen);
        }

        const letterResults = {};
        for (const L of allowed) {
            const b = bandMap[L];
            letterResults[L] =
                Math.round(drawForBand(stepIndex, b, mode) * 1e8) / 1e8;
        }
        const band = bandMap[letter];
        const r = letterResults[letter];

        if (r <= EPS) {
            return finishAlphaTreeBust(req, res, user, userId, state, {
                step: stepIndex,
                value: r,
                band: "zero",
                letter,
                letterResults,
            });
        }

        state.cumulativeMultiplier = round2(state.cumulativeMultiplier * r);
        state.step = stepIndex + 1;
        state.bandPermutation = undefined;

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
                ...(settings.chosenLetterHighRate !== undefined && {
                    chosenLetterHighRate: Number(settings.chosenLetterHighRate),
                }),
                ...(settings.zButtonHighRate !== undefined && {
                    zButtonHighRate: Number(settings.zButtonHighRate),
                }),
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
