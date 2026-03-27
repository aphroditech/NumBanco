import TwistView from "../models/TwistView.js";
import User from "../models/User.js";
import {
    enrichTwistViewsWithUser,
    VIEW_LIMIT,
    publishTwistViewFeed,
} from "../services/twist/twistViewFeed.js";
import { pickTwistSymbol, resolveTwistSpin, twistTotalMultiplierSum } from "../services/twist/twistPlayLogic.js";
import { getTwistRatesForMode, getTwistSettingsMerged } from "../services/twist/twistSettings.service.js";

const MIN_BET = 0.5;
const MAX_BET = 20;

function toNumberOrZero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function intIdx(v) {
    const n = Math.floor(toNumberOrZero(v));
    return n < 0 ? 0 : n;
}

const twistUserProjection = {
    userId: 1,
    balance: 1,
    totalBet: 1,
    refreshBet: 1,
    lotterybet: 1,
    twistGreenMultIndex: 1,
    twistOrangeMultIndex: 1,
    twistPurpleMultIndex: 1,
    twistLastBetAmount: 1,
    twistHistory: 1,
    twistMode: 1,
    avatar: 1,
    altas: 1,
    membership: 1,
};

function normalizeTwistMode(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 1;
    if (n < 0) return 0;
    if (n > 2) return 2;
    return n;
}

function updateTwistModeByTotalProfit(user) {
    const history = Array.isArray(user?.twistHistory) ? user.twistHistory : [];
    const totalProfit = history.reduce((acc, item) => {
        const p = Number(item?.profit);
        return acc + (Number.isFinite(p) ? p : 0);
    }, 0);
    const totalBet = history.reduce((acc, item) => {
        const b = Number(item?.betAmount);
        return acc + (Number.isFinite(b) ? b : 0);
    }, 0);
    const netProfit = totalProfit - totalBet;
    if (netProfit > 100) user.twistMode = 2;
    else if (netProfit < -10) user.twistMode = 0;
    else user.twistMode = normalizeTwistMode(user.twistMode);
}

function buildTwistCompactUser(user, overrides = {}) {
    const raw = typeof user?.toObject === "function" ? user.toObject() : { ...user };
    const history =
        overrides.twistHistory ??
        (Array.isArray(raw.twistHistory) ? raw.twistHistory : []);
    return {
        userId: raw.userId,
        balance: overrides.balance ?? raw.balance,
        totalBet: overrides.totalBet ?? raw.totalBet,
        refreshBet: overrides.refreshBet ?? raw.refreshBet,
        lotterybet: overrides.lotterybet ?? raw.lotterybet,
        twistGreenMultIndex: overrides.twistGreenMultIndex ?? raw.twistGreenMultIndex ?? 0,
        twistOrangeMultIndex: overrides.twistOrangeMultIndex ?? raw.twistOrangeMultIndex ?? 0,
        twistPurpleMultIndex: overrides.twistPurpleMultIndex ?? raw.twistPurpleMultIndex ?? 0,
        twistLastBetAmount: overrides.twistLastBetAmount ?? raw.twistLastBetAmount ?? 0,
        twistMode: overrides.twistMode ?? normalizeTwistMode(raw.twistMode),
        twistHistory: history,
        avatar: raw.avatar,
        altas: raw.altas,
        membership: raw.membership,
    };
}

export const getTwistView = async (_req, res) => {
    try {
        const views = await TwistView.find().sort({ createdAt: -1 }).limit(VIEW_LIMIT);
        const data = await enrichTwistViewsWithUser(views);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("[twist] getTwistView", error);
        return res.status(500).json({ error: error.message });
    }
};

export const postTwistBet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findOne({ userId }, twistUserProjection).lean();
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const numBet = round2(toNumberOrZero(req.body?.betAmount ?? req.body?.amount));
        if (numBet < MIN_BET || numBet > MAX_BET) {
            return res.status(400).json({ error: `Bet must be between ${MIN_BET} and ${MAX_BET}` });
        }

        const bal = round2(toNumberOrZero(user.balance));
        if (numBet > bal) {
            return res.status(400).json({ error: "You don't have enough balance to bet" });
        }

        const twistSettings = await getTwistSettingsMerged();
        const modeRates = getTwistRatesForMode(twistSettings, user.twistMode);
        const symbol = pickTwistSymbol({
            purple: modeRates.pRate,
            orange: modeRates.oRate,
            green: modeRates.gRate,
            stone: modeRates.stoneRate,
            mouse: modeRates.mouseRate,
        });

        const spin = resolveTwistSpin({
            twistGreenMultIndex: user.twistGreenMultIndex,
            twistOrangeMultIndex: user.twistOrangeMultIndex,
            twistPurpleMultIndex: user.twistPurpleMultIndex,
        }, symbol);

        const multiplier = round2(spin.multiplier);
        const payout = round2(numBet * multiplier);
        // Bet: balance -= stake only. Cash out: balance += lastBet × sum(purple/orange/green ladder values at counts).
        const nextBalance = round2(bal - numBet);

        const updateResult = await User.updateOne(
            { userId, balance: { $gte: numBet } },
            {
                $inc: {
                    balance: -numBet,
                    totalBet: numBet,
                    refreshBet: numBet,
                    lotterybet: numBet,
                },
                $set: {
                    twistGreenMultIndex: spin.twistGreenMultIndex,
                    twistOrangeMultIndex: spin.twistOrangeMultIndex,
                    twistPurpleMultIndex: spin.twistPurpleMultIndex,
                    twistLastBetAmount: numBet,
                },
                $push: {
                    twistHistory: {
                        betAmount: numBet,
                        totalMultiplier: 0,
                        profit: 0,
                        busted: false,
                        createAt: new Date(),
                    },
                },
            }
        );

        if (!updateResult?.matchedCount) {
            return res.status(409).json({ error: "Twist bet conflict" });
        }

        const data = {
            symbol: spin.symbol,
            multiplier,
            bet: numBet,
            win: payout,
        };

        const response = res.status(200).json({
            message: "ok",
            data,
            user: buildTwistCompactUser(user, {
                balance: nextBalance,
                twistLastBetAmount: numBet,
                totalBet: toNumberOrZero(user.totalBet) + numBet,
                refreshBet: toNumberOrZero(user.refreshBet) + numBet,
                lotterybet: toNumberOrZero(user.lotterybet) + numBet,
                twistHistory: [
                    ...(Array.isArray(user.twistHistory) ? user.twistHistory : []),
                    {
                        betAmount: numBet,
                        totalMultiplier: 0,
                        profit: 0,
                        busted: false,
                        createAt: new Date(),
                    },
                ],
                twistGreenMultIndex: spin.twistGreenMultIndex,
                twistOrangeMultIndex: spin.twistOrangeMultIndex,
                twistPurpleMultIndex: spin.twistPurpleMultIndex,
            }),
        });

        return response;
    } catch (error) {
        console.error("[twist] postTwistBet", error);
        return res.status(500).json({ error: error.message || "Server error" });
    }
};

/**
 * Cash out: balance += lastBet × twistTotalMultiplierSum(p,o,g); RealView result = that sum, win = same payout.
 */
export const postTwistCashOut = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findOne({ userId }, twistUserProjection).lean();
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const g = intIdx(user.twistGreenMultIndex);
        const o = intIdx(user.twistOrangeMultIndex);
        const p = intIdx(user.twistPurpleMultIndex);
        const base = round2(toNumberOrZero(user.twistLastBetAmount));
        const resultSum = round2(twistTotalMultiplierSum(p, o, g));
        const win = round2(base * resultSum);

        const updateOps = {
            $inc: { balance: win },
            $set: {
                twistLastBetAmount: 0,
                twistGreenMultIndex: 0,
                twistOrangeMultIndex: 0,
                twistPurpleMultIndex: 0,
            },
        };
        if (base > 0) {
            updateOps.$push = {
                twistHistory: {
                    betAmount: 0,
                    totalMultiplier: resultSum,
                    profit: win,
                    busted: false,
                    createAt: new Date(),
                },
            };
        }

        const updatedUser = await User.findOneAndUpdate({ userId }, updateOps, {
            new: true,
        })
            .select(twistUserProjection)
            .lean();

        if (!updatedUser) {
            return res.status(409).json({ error: "Twist cash out failed" });
        }

        if (base > 0) {
            const modeHolder = {
                twistHistory: updatedUser.twistHistory,
                twistMode: updatedUser.twistMode,
            };
            updateTwistModeByTotalProfit(modeHolder);
            if (modeHolder.twistMode !== normalizeTwistMode(updatedUser.twistMode)) {
                await User.updateOne({ userId }, { $set: { twistMode: modeHolder.twistMode } });
                updatedUser.twistMode = modeHolder.twistMode;
            } else {
                updatedUser.twistMode = normalizeTwistMode(updatedUser.twistMode);
            }
        }

        /** RealView: result = sum of ladder multipliers at p,o,g; win = lastBet × result. */
        if (base > 0) {
            await TwistView.create({
                userId,
                bet: base,
                win,
                result: resultSum,
                symbol: "cashout",
                isUser: 1,
                time: new Date(),
            });
            const ably = req.app?.locals?.ably;
            publishTwistViewFeed(ably).catch((err) => {
                console.error("[twist] publishTwistViewFeed", err);
            });
        }

        return res.status(200).json({
            message: "ok",
            data: {
                win,
                bet: base,
                result: resultSum,
                purpleIndex: p,
                orangeIndex: o,
                greenIndex: g,
            },
            user: buildTwistCompactUser(updatedUser),
        });
    } catch (error) {
        console.error("[twist] postTwistCashOut", error);
        return res.status(500).json({ error: error.message || "Server error" });
    }
};
