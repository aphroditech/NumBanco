import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { sendUserResponse } from "../utils/responses.js";

import Amount from "../models/Amount.js";

import cron from "node-cron"

export const partnershipDeposit = async (req, res) => {
    try {
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId }
        );

        const banAmount = await Amount.findOne({})

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const earnHistory = user.partnerActivity || [];
        const depHistory = user.partnerEarnHistory || [];

        let totalHistoryEarn = 0;
        let totalDepEarn = 0;

        earnHistory.map((item, index) => {
            totalHistoryEarn += 100 * item.partnerEarn;
        })
        depHistory.map((item, index) => {
            totalDepEarn += 100 * item.earnAmt;
        })

        const calculatedPartnerEarn = (totalHistoryEarn - totalDepEarn) / 100;

        // check if user is allowed to convert partnership earnings
        if (calculatedPartnerEarn >= banAmount.partner) {
            user.partnerFlag = 2;
            await user.save();
            return res.json({ user: user, message: `Earnings above ${banAmount.partner} require administrative approval to be converted. Please wait.` })
        }

        // Floating point safe comparison
        const EPSILON = 0.00001;
        if (Math.abs(calculatedPartnerEarn - user.partnerEarn) > EPSILON) {
            return res.status(400).json({ message: "Inconsistent earnings data" });
        }

        if (user.partnerEarn <= 0) {
            return res.status(400).json({ message: "No earnings to convert" });
        }

        // Apply changes
        user.partnerEarnHistory.push({
            earnAmt: user.partnerEarn,
            date: new Date(),
        });

        user.balance = (1000 * user.balance + 1000 * user.partnerEarn) / 1000;
        const data = {
            amount: user.partnerEarn,
            date: new Date(),
            type: "partnerDeposit"
        }

        // Initialize totalhistory if it doesn't exist
        if (!user.totalhistory) {
            user.totalhistory = [];
        }

        user.totalhistory.push(data);
        user.partnerEarn = 0;

        await user.save();

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const tempUser = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                country: 0,
                pumpingMode: 0,
                fishingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );

        return sendUserResponse(
            res,
            `Successfully converted to credit $${calculatedPartnerEarn}`,
            tempUser,
            { token }
        );

    } catch (err) {
        console.error("Partnership deposit error:", err);
        res.status(500).json({ message: "Server error", err: err.message });
    }
};


let cronStarted = false;

export const startPartnerDepositCron = (ably) => {
    if (cronStarted) return;
    cronStarted = true;

    cron.schedule("*/1 * * * *", async () => {
        try {
            const users = await User.find({
                partnerFlag: { $in: [3, 4] }
            },
                {
                    "wallets.eth.privateKey": 0,
                    "wallets.bsc.privateKey": 0,
                    "wallets.tron.privateKey": 0,
                    password: 0,
                    country: 0,
                    pumpingMode: 0,
                    fishingMode: 0,
                    rubicMode: 0,
                    partnerId: 0,
                    partnerActivity: 0,
                    lastClickDate: 0,
                    canWithdraw: 0,
                });

            for (const user of users) {
                if (user.partnerFlag === 3) {
                    const depositAmount = user.partnerEarn;

                    if (depositAmount <= 0) continue;

                    user.partnerFlag = 1;
                    user.balance = (1000 * user.balance + 1000 * depositAmount) / 1000;
                    user.partnerEarn = 0;
                    user.partnerEarnHistory.push({
                        earnAmt: depositAmount,
                        date: new Date(),
                    });

                    const data = {
                        amount: depositAmount,
                        date: new Date(),
                        type: "partner"
                    }

                    // Initialize totalhistory if it doesn't exist
                    if (!user.totalhistory) {
                        user.totalhistory = [];
                    }

                    user.totalhistory.push(data);

                    await user.save();

                    if (ably) {
                        const channel = ably.channels.get("partnershipDeposit");

                        channel.publish("partnerEarnDeposit", {
                            userInfo: user,
                            user: user.userId,
                            partnerEarn: depositAmount,
                            msg: `You have successfully converted $${depositAmount} affiliate earnings.`
                        }).catch(console.error);
                    }
                } else if (user.partnerFlag === 4) {
                }
            }

        } catch (error) {
            console.error("[CRON] Partner deposit failed:", error);
        }
    });
};

