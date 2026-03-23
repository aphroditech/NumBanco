import BetTicket from "../models/BetTicket.js";
import Bet_TierA from "../models/Bet_TierA.js";
import Bet_TierB from "../models/Bet_TierB.js";
import Bet_TierC from "../models/Bet_TierC.js";

import cron from "node-cron"

import User from "../models/User.js";
import RealTimeWinner from "../models/RealTimeWinner.js"
import { userActive } from "../middleware/userActive.js";

export const buyTickets = async (req, res) => {
    try {
        let isPreBet = false;
        const { betId, level, membership } = req.body;
        let { tickets } = req.body;

        const userId = req.user.userId || req.user.userId;
        const price = level === 2 ? 50 : (level === 1 ? 5 : 1);
        // let preBet = await BetTicket.find();

        // Parallel database queries for better performance
        const [betTicketDoc, user] = await Promise.all([
            BetTicket.findOne({ betId, level }),
            User.findOne(
                { userId: userId },
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
            )
        ]);

        let betTicket = betTicketDoc;
        if (!betTicket) {
            betTicket = new BetTicket({
                betId,
                sellTicket: [],
                sellTicketCnt: 0,
                ticketHolder: [],
                level: level || 0,
                membership: membership || 0
            });
            isPreBet = true;
            // Save the new bet ticket immediately
            await betTicket.save();
        }

        // Calculate total price
        const totalPrice = price * tickets.length;

        // Check user balance
        if (user.balance < totalPrice) {
            return res.status(400).json({
                message: "You don't have enough money to purchase these tickets",
                required: totalPrice,
                current: user.balance
            });
        }

        tickets = tickets.filter(item => !betTicket.sellTicket.includes(item));

        if (tickets.length == 0) return res.status(400).json({ message: "The tickets have already sold" });

        // Add all available tickets to sold tickets
        betTicket.sellTicket.push(...tickets);
        betTicket.sellTicketCnt = betTicket.sellTicket.length;
        betTicket.level = level || 0;

        // Find or update ticket holder
        const existingHolder = betTicket.ticketHolder.find(
            holder => holder.userId === userId
        );

        if (existingHolder) {
            existingHolder.ticketCnt += tickets.length;
            existingHolder.ticket.push(...tickets);
        } else {
            betTicket.ticketHolder.push({
                avatar: req.user.avatar,
                userId: userId,
                altas: req.user.altas,
                ticketCnt: tickets.length,
                ticket: [...tickets],
                membership: req.user.membership,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
            });
        }

        var currentBet;
        if (betTicket.level == 0) currentBet = await Bet_TierA.findOne({ betId: betTicket.betId }).lean();
        if (betTicket.level == 1) currentBet = await Bet_TierB.findOne({ betId: betTicket.betId }).lean();
        if (betTicket.level == 2) currentBet = await Bet_TierC.findOne({ betId: betTicket.betId }).lean();

        if (currentBet) {
            betTicket.timing.push({
                userId: userId,
                altas: req.user.altas,
                ticketCnt: tickets.length,
                ticket: [...tickets],
                membership: req.user.membership,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
                time: Math.round((Date.now() / 1000 - currentBet.betStartTime)),
            });
        } else {
            betTicket.timing.push({
                userId: userId,
                altas: req.user.altas,
                ticketCnt: tickets.length,
                ticket: [...tickets],
                membership: req.user.membership,
                isUser: req.user.partnerLevel > 0 ? 1 : 0,
                time: 0,
            });
        }

        // Deduct balance
        const data = {
            amount: -totalPrice,
            date: new Date(),
            type: "numexa"
        }

        // Initialize totalhistory if it doesn't exist
        if (!user.totalhistory) {
            user.totalhistory = [];
        }

        user.totalhistory.push(data);
        user.balance = (1000 * user.balance - 1000 * totalPrice) / 1000;
        user.totalBet = (1000 * user.totalBet + 1000 * totalPrice) / 1000;
        user.refreshBet = (1000 * user.refreshBet + 1000 * totalPrice) / 1000;
        user.lotterybet = (1000 * user.lotterybet + 1000 * totalPrice) / 1000;

        // Save both user and betTicket in parallel
        await Promise.all([
            user.save(),
            betTicket.save()
        ]);

        // Prepare response data before async operations
        const responseData = {
            // message: `${tickets.length} ticket(s) purchased successfully`,
            tickets: tickets,
            betId: betId,
            userId: userId,
            totalPrice: totalPrice,
            level: level,
            remainingBalance: user.balance,
            membership: user.membership,
            user: user.toObject ? user.toObject() : user
        };

        // Send response immediately - don't wait for Ably or bet end check
        res.json(responseData);

        const currentdata = await BetTicket.findOne({
            betId: betId,
            level: level
        }).lean();

        const bethistory = await User.findOne({ userId: userId, 'bethistory.betId': betId, 'bethistory.tier': level }).lean();

        if (bethistory) {
            await User.updateOne(
                {
                    userId: userId,
                    bethistory: {
                        $elemMatch: {
                            betId: betId,
                            tier: level
                        }
                    }
                },
                {
                    $inc: {
                        'bethistory.$.bet': totalPrice
                    },
                }
            );
        } else {
            const data = {
                tier: level,
                betId: betId,
                bet: totalPrice,
                win: 0,
                createAt: new Date()
            }
            await User.updateOne({ userId: userId }, { $push: { bethistory: data } });
        }

        // Perform async operations after response is sent (non-blocking)
        setImmediate(async () => {
            try {
                const ably = req.app.locals.ably;
                if (ably) {
                    const channelName = "Num2Bet";
                    const channel = ably.channels.get(channelName);

                    // Convert betTicket to plain object for publishing
                    var lastBet;
                    if (level == 0) lastBet = await Bet_TierA.findOne().sort({ betId: -1 }).lean();
                    if (level == 1) lastBet = await Bet_TierB.findOne().sort({ betId: -1 }).lean();
                    if (level == 2) lastBet = await Bet_TierC.findOne().sort({ betId: -1 }).lean();

                    const PreBetdata = await BetTicket.find({ betId: { $gt: Number(Number(lastBet ? lastBet.betId : 1)) }, level: level }, { betId: 1, sellTicketCnt: 1 }).lean();

                    // Publish only the relevant data
                    const batchMessageData = {
                        currentdata: currentdata,
                        alldata: [PreBetdata],
                        level: level,
                        tickets: tickets.map(ticket => Number(ticket)),
                        betId: Number(betId),
                        userId: String(userId),
                        membership: user.membership,
                        timestamp: Date.now(),
                        isBatch: true
                    };

                    // Publish without awaiting (fire and forget for speed)
                    channel.publish("ticketSold", batchMessageData).catch(err => {
                        console.error("❌ [betController] Error publishing to Ably:", err);
                    });
                }
            } catch (asyncError) {
                console.error("Error in async operations:", asyncError);
            }
        });
    }
    catch (err) {
        console.log("Error in buyTickets:", err);
        return res.status(500).json({ message: "Server Error", err: err.message });
    }
}

export const getSoldTickets = async (req, res) => {
    try {
        const { betId, level } = req.body;
        const userId = req.user.userId || req.user._id?.toString();

        if (!betId) {
            return res.status(400).json({ message: "betId is required" });
        }

        const betTicket = await BetTicket.findOne({ betId, level }).lean();

        if (!betTicket) {
            return res.json({
                soldTickets: [],
                sellTicketCnt: 0,
                ticketOwners: {},
                myTickets: [],
                level: 0,
                betTicket: betTicket
            });
        }

        // Build ticket owners map (ensure userId is string for consistent comparison)
        const ticketOwners = {};
        const userIdStr = String(userId);

        betTicket.ticketHolder.forEach(holder => {

        })

        betTicket.ticketHolder.forEach(holder => {
            const holderIdStr = String(holder.userId);
            holder.ticket.forEach(ticketNum => {
                ticketOwners[ticketNum] = holderIdStr;
            });
        });

        // Get tickets owned by current user (compare as strings)
        const myTickets = betTicket.ticketHolder
            .find(holder => String(holder.userId) === userIdStr)
            ?.ticket || [];
        return res.json({
            soldTickets: betTicket.sellTicket || [],
            sellTicketCnt: betTicket.sellTicketCnt || 0,
            ticketOwners: ticketOwners,
            myTickets: myTickets,
            betTicket: betTicket
        });
    }
    catch (err) {
        console.log("Error in getSoldTickets:", err);
        return res.status(500).json({ message: "Server Error", err: err.message });
    }
}

export const getBetId = async (req, res) => {
    try {
        const level = Number(req.query.data);

        const TIER_MODELS = {
            0: Bet_TierA,
            1: Bet_TierB,
            2: Bet_TierC,
        };

        const TierModel = TIER_MODELS[level];
        if (!TierModel) {
            return res.status(400).json({ message: "Invalid tier data" });
        }

        // Get latest bet by betId
        const betData = await TierModel.findOne().sort({ betId: -1 });
        if (!betData) {
            return res.json({
                differenceTime: 0,
                BetData: null,
                betTicketData: null,
            });
        }

        // Get ticket data
        const betTicketData = await BetTicket.findOne({
            level,
            betId: betData.betId,
        });
        return res.json({
            differenceTime: Date.now() - betData.betStartTime * 1000,
            BetData: betData,
            betTicketData,
        });

    } catch (err) {
        console.error("Error in getBetId:", err);
        return res.status(500).json({
            message: "Server Error",
            error: err.message,
        });
    }
};

export const getBetHistory = async (req, res) => {
    try {
        const { betId, level } = req.body;
        const userId = req.user.userId;

        if (!betId) {
            return res.status(400).json({ message: "betId is required" });
        }

        /* =========================
           1. Get Tier Result
        ========================= */
        let betResultDoc = null;

        if (level == 0) {
            betResultDoc = await Bet_TierA.findOne({ betId }).lean();
        } else if (level == 1) {
            betResultDoc = await Bet_TierB.findOne({ betId }).lean();
        } else if (level == 2) {
            betResultDoc = await Bet_TierC.findOne({ betId }).lean();
        }

        if (!betResultDoc) {
            return res.json({
                BetResults: [],
                tickets: 0,
                winners: {
                    first: [],
                    second: [],
                    third: []
                }
            });
        }

        /* =========================
           2. Get Ticket Info
        ========================= */
        const betTicket = await BetTicket.findOne({ betId, level }).lean();
        const ticketHolders = betTicket?.ticketHolder || [];

        const myTickets =
            ticketHolders.find(h => h.userId === userId)?.ticketCnt || 0;

        /* =========================
           3. Build Winner Arrays
        ========================= */
        const betResult = betResultDoc.betResult || {};

        const buildWinnerArray = (betKey) => {
            if (!betResult[betKey]) return [];

            return betResult[betKey].winUserId.map((uid, index) => ({
                userId: uid,
                username: betResult[betKey].winUsername[index],
                winNum: betResult[betKey].winNum[index],
                ticketCnt:
                    ticketHolders.find(h => h.userId === uid)?.ticketCnt || 0
            }));
        };

        const winners = {
            first: buildWinnerArray("betOne"),
            second: buildWinnerArray("betTwo"),
            third: buildWinnerArray("betThree")
        };

        /* =========================
           4. Response
        ========================= */
        return res.json({
            BetResults: betResultDoc,
            tickets: myTickets,
            winners
        });

    } catch (err) {
        console.log("Error in getBetHistory:", err);
        return res.status(500).json({
            message: "Server Error",
            error: err.message
        });
    }
};


export const getMyHistory = async (req, res) => {
    try {
        const { betId, level, type } = req.body;

        let betTicket = null;
        if (type === 'users') {
            if (!betId) {
                return res.status(400).json({ message: "betId is required" });
            }

            if (level == 0) {
                betTicket = await Bet_TierA.findOne({ betId });
            }

            else if (level == 1) {
                betTicket = await Bet_TierB.findOne({ betId });
            }

            else if (level == 2) {
                betTicket = await Bet_TierC.findOne({ betId });
            }

            if (!betTicket) {
                return res.json({
                    getBetHistory: [],
                });
            }
        }


        return res.json({
            BetResults: betTicket || [],
        });
    }
    catch (err) {
        console.log("Error in getMyHistory:", err);
        return res.status(500).json({ message: "Server Error", err: err.message });
    }
}

export const getMyBetIds = async (req, res) => {
    try {
        const { betId, level } = req.body;
        const userId = String(req.user.userId);

        const betIds = await BetTicket.find(
            {
                level: Number(level),
                betId: { $lt: Number(betId) },
                "ticketHolder.userId": userId,
            },
            { _id: 0, betId: 1 }
        )
            .sort({ betId: -1 })
            .limit(10)
            .lean();

        return res.json(betIds.map((b) => b.betId));
    } catch (err) {
        console.error("getMyBetIds error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getCurrentBetData = async (req, res) => {
    try {
        const { level, betId } = req.body;
        const currentdata = await BetTicket.findOne({
            betId: betId,
            level: level
        }).lean();


        return res.json(currentdata);
    }
    catch (err) {
        console.log("Error in getCurrentBetData:", err);
        res.status(500).json({ message: "Server Error", err: err.message });
    }
}


export const onlineUser = async (req, res) => {
    try {
        const { level } = req.query;
        // const user = await User.findOne({ userAuthId: req.user.userAuthId });
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
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
        user.active = Number(level) + 2;
        await user.save();
        const activeUsers = await userActive();

        const ably = req.app.locals.ably;
        if (ably) {
            const channel = ably.channels.get("Num2Bet");
            channel.publish("onlineUser", activeUsers);
        }
        res.json("success");
    }
    catch (err) {
        console.log("Error in onlineUser:", err);
        res.status(500).json({ message: "Server Error", err: err.message });
    }
}

export const offlineUser = async (req, res) => {
    try {
        // const user = await User.findOne({ userAuthId: req.user.userAuthId });
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
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
        user.active = 1;
        await user.save();
        const activeUsers = await userActive();


        const ably = req.app.locals.ably;
        if (ably) {
            const channel = ably.channels.get("Num2Bet");
            channel.publish("offlineUser", activeUsers);
        }
        return res.json("success");
    }
    catch (err) {
        console.log("Error in offlineUser:", err);
        res.status(500).json({ message: "Server Error", err: err.message });
    }
}

export const activeusers = async (req, res) => {
    try {
        const activeUsers = await userActive();
        return activeUsers;
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch active users" });
    }
};