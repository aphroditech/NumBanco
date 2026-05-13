import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendUserResponse } from "../utils/responses.js";
import RealTimeWinner from "../models/RealTimeWinner.js";
import MinesHistory from "../models/mines/MinesHistory.js";
import MiningHistory from "../models/jackal/MiningHistory.js";
import { generateUserWallets } from "../utils/walletGenerator.js";

import { incrementAuthStat } from "./authStateService.js";
import { userActive } from "../middleware/userActive.js";
import { send2faEmail } from "../utils/send2faEmail.js";
import { sendNewPassword } from "../utils/sendNewPassword.js";

import crypto from "crypto";

export const register = async (req, res) => {
    try {

        const { userAuthId, altas, password, email, partnerId, countryCode, ipAddress } = req.body;

        const existsId = await User.findOne({ userAuthId });
        if (existsId) {
            return res.status(400).json({ message: "Id already exists" });
        }
        if (email) {
            const existsEmail = await User.find({ email: email.trim().toLowerCase() });
            if (existsEmail.length > 0) {
                return res.status(400).json({ message: "Email already exists" });
            }
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique wallets for the user
        const wallets = generateUserWallets();

        const user = new User({
            userAuthId,
            altas,
            password: hashedPassword,
            email: email || null,
            partnerId: partnerId || "",
            wallets: wallets,
            active: 1,
            country: countryCode,
            ipAddress: ipAddress,
            totalhistory: [{
                amount: 5,
                type: "free",
                date: new Date()
            }]
        });

        // increase the inviteUserCnt
        const partnerUser = await User.findOne({ userId: partnerId });
        if (partnerUser) {
            partnerUser.inviteUserCnt += 1;
            await partnerUser.save();
        }

        await Promise.all([
            user.save(),
        ]);
        const tempUser = await User.findOne(
            { userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                country: 0,
                password: 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
            }
        );

        // increate daily sign up users
        await incrementAuthStat(false); // false = signup
        // ---- AUTO LOGIN: generate token ----
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return sendUserResponse(res, "Registration successful! Welcome aboard.", tempUser, { token });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error", err });
    }
};

export const login = async (req, res) => {
    try {
        const { userAuthId, password, countryCode, ipAddress } = req.body;
        console.log("county code", countryCode);

        const user = await User.findOne(
            { userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
            }
        );

        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

        // If 2FA is enabled: send code via Postmark and require verify-2fa step
        if (user.twofactor) {
            const emailAddress = (user.email || "").trim();
            if (!emailAddress) {
                return res.status(400).json({ message: "2FA is enabled but no email is set on your account." });
            }

            const code = String(Math.floor(100000 + Math.random() * 900000));
            user.twofactorCode = crypto.createHash("sha256").update(code).digest("hex");
            user.twofactorExpires = new Date(Date.now() + 5 * 60 * 1000);
            await user.save();

            res.status(200).json({
                message: "Verification code sent to your email.",
                twofactorRequired: true,
                userAuthId: user.userAuthId,
            });

            try {
                await send2faEmail(emailAddress, code);
            } catch (err) {
                user.twofactorCode = undefined;
                user.twofactorExpires = undefined;
                await user.save();
                const isPostmarkPending = err.message === "POSTMARK_PENDING_APPROVAL";
                return res.status(503).json({
                    message: isPostmarkPending
                        ? "Verification emails are temporarily limited while our email provider is being approved. Please contact support or try again in a few days."
                        : "Could not send verification email. Please try again later.",
                });
            }

            return;
        }
        await incrementAuthStat(true);
        if (user.totalBet >= 100 && user.totalBet < 1000 && user.membership === 0) {
            user.membership = 1;
        } else if (user.totalBet >= 1000 && user.membership !== 2) {
            user.membership = 2;
        }
        user.active = 1;
        user.country = countryCode;
        user.ipAddress = ipAddress;
        await user.save();

        // Normal login if no 2FA
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return sendUserResponse(res, "Login successful!", user, { token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", err });
    }
};

export const me = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ authenticated: false });
    }
    res.json({ authenticated: true });
}

export const verify2fa = async (req, res) => {
    try {
        const { userAuthId, code } = req.body;
        if (!userAuthId || !code) {
            return res.status(400).json({ message: "userAuthId and code are required" });
        }

        const user = await User.findOne(
            { userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
            }
        );
        if (!user) return res.status(400).json({ message: "User not found" });

        const hashedCode = crypto.createHash("sha256").update(String(code).trim()).digest("hex");
        const expiresAt = user.twofactorExpires ? new Date(user.twofactorExpires).getTime() : 0;

        if (user.twofactorCode !== hashedCode || expiresAt < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        user.twofactorCode = undefined;
        user.twofactorExpires = undefined;
        await incrementAuthStat(true);
        user.active = 1;
        await user.save();

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        return sendUserResponse(res, "Login successful!", user, { token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

export const resendTwoFa = async (req, res) => {
    try {
        const { userAuthId } = req.body;
        if (!userAuthId) {
            return res.status(400).json({ message: "userAuthId is required" });
        }

        const user = await User.findOne({ userAuthId });
        if (!user) return res.status(400).json({ message: "User not found" });

        const emailAddress = (user.email || "").trim();
        if (!emailAddress) {
            return res.status(400).json({ message: "No email is set on your account." });
        }

        const code = String(Math.floor(100000 + Math.random() * 900000));
        user.twofactorCode = crypto.createHash("sha256").update(code).digest("hex");
        user.twofactorExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        try {
            await send2faEmail(emailAddress, code);
            return res.json({ message: "Verification code resent to your email." });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to send verification code" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

export const getUserData = async (req, res) => {
    try {
        const { userAuthId } = req.user;
        const user = await User.findOne(
            { userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
            }
        );

        if (user) {
            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            return sendUserResponse(res, "", user, { token });
        }
    } catch (err) {
        res.status(500).json({ message: "Server Error" }, err);
    }
}

export const getWinners = async (req, res) => {
    try {
        const userHistoryWinners = await User.aggregate([
            {
                $project: {
                    altas: 1,
                    avatar: 1,
                    membership: 1,
                    allWins: {
                        $concatArrays: [
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$alphaTreeHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.profit", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "AlphaTree", winAmount: "$$h.profit", date: "$$h.createAt" }
                                }
                            },
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$cloudSpreadHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.win", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "CloudSpread", winAmount: "$$h.win", date: "$$h.createAt" }
                                }
                            },
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$cocoHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.profit", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "Coco", winAmount: "$$h.profit", date: "$$h.createAt" }
                                }
                            },
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$fishingHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.win", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "Fishing", winAmount: "$$h.win", date: "$$h.createAt" }
                                }
                            },
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$pumpingHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.win", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "Pumping", winAmount: "$$h.win", date: "$$h.createAt" }
                                }
                            },
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$updownHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.profit", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "Gravity", winAmount: "$$h.profit", date: "$$h.createAt" }
                                }
                            },
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: { $ifNull: ["$rubicHistory", []] },
                                            as: "h",
                                            cond: { $gt: ["$$h.profit", 0] }
                                        }
                                    },
                                    as: "h",
                                    in: { gameType: "Rubic", winAmount: "$$h.profit", date: "$$h.createAt" }
                                }
                            }
                        ]
                    }
                }
            },
            {
                $unwind: {
                    path: "$allWins",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $project: {
                    username: "$altas",
                    avatar: 1,
                    membership: 1,
                    gameType: "$allWins.gameType",
                    winAmount: "$allWins.winAmount",
                    date: "$allWins.date"
                }
            },
            {
                $sort: { gameType: 1, winAmount: -1, date: -1 }
            },
            {
                $group: {
                    _id: "$gameType",
                    topWinner: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: { newRoot: "$topWinner" }
            },
            {
                $sort: { winAmount: -1, date: -1 }
            }
        ]);

        const minesTopWinner = await MinesHistory.aggregate([
            {
                $unwind: {
                    path: "$history",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $match: {
                    "history.profit": { $gt: 0 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDoc"
                }
            },
            {
                $unwind: {
                    path: "$userDoc",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $project: {
                    username: "$userDoc.altas",
                    avatar: "$userDoc.avatar",
                    membership: "$userDoc.membership",
                    gameType: { $literal: "Mines" },
                    winAmount: "$history.profit",
                    date: "$history.timestamp"
                }
            },
            {
                $sort: { winAmount: -1, date: -1 }
            },
            {
                $limit: 1
            }
        ]);

        const doveTopWinner = await User.aggregate([
            {
                $match: {
                    doveWinAmount: { $gt: 0 }
                }
            },
            {
                $project: {
                    username: "$altas",
                    avatar: 1,
                    membership: 1,
                    gameType: { $literal: "Lucky Hop" },
                    winAmount: "$doveWinAmount",
                    date: "$updatedAt"
                }
            },
            {
                $sort: { winAmount: -1, date: -1 }
            },
            {
                $limit: 1
            }
        ]);

        const jackalTopWinner = await MiningHistory.aggregate([
            {
                $unwind: {
                    path: "$history",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $match: {
                    "history.winAmount": { $gt: 0 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDoc"
                }
            },
            {
                $unwind: {
                    path: "$userDoc",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $project: {
                    username: "$userDoc.altas",
                    avatar: "$userDoc.avatar",
                    membership: "$userDoc.membership",
                    gameType: { $literal: "Jackal" },
                    winAmount: "$history.winAmount",
                    date: "$history.date"
                }
            },
            {
                $sort: { winAmount: -1, date: -1 }
            },
            {
                $limit: 1
            }
        ]);

        // Top Joker Crash: user with highest sum of jokerCrashHistory.totalWin
        const jokerCrashTopWinner = await User.aggregate([
            {
                $match: {
                    "jokerCrashHistory.0": { $exists: true }
                }
            },
            {
                $project: {
                    altas: 1,
                    avatar: 1,
                    membership: 1,
                    updatedAt: 1,
                    jokerTotalWinSum: {
                        $reduce: {
                            input: { $ifNull: ["$jokerCrashHistory", []] },
                            initialValue: 0,
                            in: { $add: ["$$value", { $ifNull: ["$$this.totalWin", 0] }] }
                        }
                    }
                }
            },
            {
                $match: { jokerTotalWinSum: { $gt: 0 } }
            },
            {
                $project: {
                    username: "$altas",
                    avatar: 1,
                    membership: 1,
                    gameType: { $literal: "Joker Crash" },
                    winAmount: "$jokerTotalWinSum",
                    date: "$updatedAt"
                }
            },
            {
                $sort: { winAmount: -1, date: -1 }
            },
            {
                $limit: 1
            }
        ]);

        // Top Card Game: user with highest sum of cardGameHistory.totalWin
        const cardGameTopWinner = await User.aggregate([
            {
                $match: {
                    "cardGameHistory.0": { $exists: true }
                }
            },
            {
                $project: {
                    altas: 1,
                    avatar: 1,
                    membership: 1,
                    updatedAt: 1,
                    cardGameTotalWinSum: {
                        $reduce: {
                            input: { $ifNull: ["$cardGameHistory", []] },
                            initialValue: 0,
                            in: { $add: ["$$value", { $ifNull: ["$$this.totalWin", 0] }] }
                        }
                    }
                }
            },
            {
                $match: { cardGameTotalWinSum: { $gt: 0 } }
            },
            {
                $project: {
                    username: "$altas",
                    avatar: 1,
                    membership: 1,
                    gameType: { $literal: "Card Game" },
                    winAmount: "$cardGameTotalWinSum",
                    date: "$updatedAt"
                }
            },
            {
                $sort: { winAmount: -1, date: -1 }
            },
            {
                $limit: 1
            }
        ]);

        const winners = [...userHistoryWinners, ...minesTopWinner, ...doveTopWinner, ...jackalTopWinner, ...jokerCrashTopWinner, ...cardGameTopWinner]
            .sort((a, b) => (b.winAmount || 0) - (a.winAmount || 0))
            .slice(0, 10);

        return res.json(winners);
    } catch (err) {
        console.log(err)
    }
}

export const getRealTimeWinners = async (req, res) => {
    try {
        const data = await RealTimeWinner.find({}, { betId: 1, earn: 1, level: 1, username: 1, avatar: 1, time: 1, membership: 1 }).sort({ createdAt: -1 }).limit(50).lean();
        res.json({ realTimeWinners: data, time: Date.now() });

    } catch (err) {
        console.log(err)
    }
}

export const logout = async (req, res) => {
    try {

        setTimeout(async () => {
            const user = await User.findOne({ userAuthId: req.user.userAuthId });

            user.active = 0;

            await user.save();
        }, 1000);

        res.clearCookie("token", {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            path: "/"
        });
        res.json({ message: "Logged out successfully" });

    } catch (err) {
        console.log(err)
    }
}

export const getActiveUsers = async (req, res) => {
    try {
        const activeUsers = await userActive();
        res.json(activeUsers);
    } catch (err) {
        console.log("Error fetching active users:", err);
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: "No account found with that email" });
        }

        // Here you would generate a password reset token, save it to the user, and send an email with the reset link
        // For simplicity, we'll just return a success message
        // In a real implementation, you would use a service like SendGrid or Postmark to send the email

        const password = generateRandomString();
        user.password = await bcrypt.hash(password, 10);
        await user.save();

        res.json({ message: "New password sent to your email successfully" });

        try {
            await sendNewPassword(email, password);
        } catch (err) {
            console.error("Failed to send new password email:", err);
            return res.status(500).json({ message: "Failed to send new password email" });
        }

        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
}


// generate a random string for password reset
export function generateRandomString() {
    const length = 10;
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    const bytes = crypto.randomBytes(length);
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }

    return result;
}