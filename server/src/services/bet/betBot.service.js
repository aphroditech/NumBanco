import User from "../../models/User.js";
import Bet_TierA from "../../models/Bet_TierA.js";
import Bet_TierB from "../../models/Bet_TierB.js";
import Bet_TierC from "../../models/Bet_TierC.js";
import BetTicket from "../../models/BetTicket.js";
import * as Random from "../../math.randomfunctions/randomBot.js";
import { getChannel } from "../ably.service.js";

export const runBetBots = (ably, betId, level, turn, timeZone) => {
    const timeLine = (((timeZone - 1) * 30 / turn + (30 / turn) * (1 / 5)) * 1000);

    setTimeout(async () => {
        const betTicket = await BetTicket.findOne({ betId, level }).lean();
        if (!betTicket) return;

        if (betTicket.sellTicketCnt >= Math.floor(timeZone * 100 / turn)) return;

        let users = [];

        if (level === 0) {
            const configs = [
                { membership: 0, limit: 30 },
                { membership: 1, limit: 30 },
                { membership: 2, limit: 30 },
            ];

            users = (
                await Promise.all(
                    configs.map(c =>
                        User.find(
                            { partnerLevel: 0, membership: c.membership },
                            { userId: 1, membership: 1, avatar: 1, altas: 1, totalEarn: 1, _id: 0 }
                        )
                            .sort({ totalEarn: 1 })
                            .limit(c.limit)
                            .lean()
                    )
                )
            ).flat();
        }

        if (level === 1) {
            const configs = [
                { membership: 0, limit: 20 },
                { membership: 1, limit: 30 },
                { membership: 2, limit: 30 },
            ];

            users = (
                await Promise.all(
                    configs.map(c =>
                        User.find(
                            { partnerLevel: 0, membership: c.membership },
                            { userId: 1, membership: 1, avatar: 1, altas: 1, totalEarn: 1, _id: 0 }
                        )
                            .sort({ totalEarn: 1 })
                            .limit(c.limit)
                            .lean()
                    )
                )
            ).flat();
        }

        if (level === 2) {
            users = await User.find(
                { partnerLevel: 0, membership: 2 },
                { userId: 1, membership: 1, avatar: 1, altas: 1, _id: 0 }
            )
                .sort({ totalEarn: 1 })
                .limit(30)
                .lean();
        }

        if (!users.length) return;

        const randomSold = Random.randomsoldticketsFunction(
            betTicket.sellTicketCnt,
            timeZone,
            turn
        );

        const randomUserCnt = Random.getRandomInt(
            1,
            Math.floor(randomSold / Random.getRandomInt(4, 5)) + 1
        );

        const divided = Random.divideXIntoRandomParts(
            randomSold,
            randomUserCnt
        );

        const matchedUsers = Random.matchUsersToX(users, divided);
        const channel = await getChannel(ably, "Num2Bet");

        for (let i = 0; i < matchedUsers.length; i++) {
            let needCount = divided[i];
            if (!Number.isInteger(needCount) || needCount <= 0) continue;

            const user = matchedUsers[i];
            let retries = 3;

            while (retries--) {
                const fresh = await BetTicket.findOne(
                    { betId, level },
                    { sellTicket: 1 }
                ).lean();

                const candidates = Random.getRandomNumbersExcludingY(
                    needCount,
                    fresh.sellTicket
                );

                if (!candidates.length) break;

                const updated = await BetTicket.findOneAndUpdate(
                    {
                        betId,
                        level,
                        sellTicket: { $nin: candidates }
                    },
                    {
                        $addToSet: { sellTicket: { $each: candidates } }
                    },
                    { new: true }
                );

                if (!updated) continue; // collision → retry

                const beforeSet = new Set(fresh.sellTicket);
                const tickets = candidates.filter(t => !beforeSet.has(t));

                if (!tickets.length) break;

                const betTicket = await BetTicket.findOne({ betId, level });

                var currentBet;
                if (level == 0) currentBet = await Bet_TierA.findOne({ betId: betId }).lean();
                if (level == 1) currentBet = await Bet_TierB.findOne({ betId: betId }).lean();
                if (level == 2) currentBet = await Bet_TierC.findOne({ betId: betId }).lean();

                betTicket.timing.push({
                    userId: user.userId || user._id?.toString(),
                    altas: user.altas,
                    ticketCnt: tickets.length,
                    ticket: [...tickets],
                    membership: user.membership,
                    isUser: user.partnerLevel > 0 ? 1 : 0,
                    time: Math.round((Date.now() / 1000 - currentBet.betStartTime))
                });
                await betTicket.save();

                const userExists = await BetTicket.findOne({ betId, level, ticketHolder: { $elemMatch: { userId: user.userId } } });
                if (userExists) {
                    await BetTicket.updateOne(
                        {
                            betId,
                            level,
                            "ticketHolder.userId": user.userId
                        },
                        {
                            $inc: {
                                sellTicketCnt: tickets.length,
                                "ticketHolder.$.ticketCnt": tickets.length
                            },
                            $push: { "ticketHolder.$.ticket": { $each: tickets } }
                        }
                    );
                } else {
                    await BetTicket.updateOne(
                        { betId, level },
                        {
                            $inc: { sellTicketCnt: tickets.length },
                            $push: {
                                ticketHolder: {
                                    altas: user.altas,
                                    avatar: user.avatar,
                                    userId: user.userId,
                                    ticketCnt: tickets.length,
                                    ticket: tickets,
                                    membership: user.membership,
                                    isUser: 0
                                }
                            }
                        }
                    );
                }

                const currentdata = await BetTicket.findOne({
                    betId,
                    level
                }).lean();

                const PreBetdata = await BetTicket.find({
                    betId: { $gt: betId },
                    level
                }).lean();

                await channel.publish("ticketSold", {
                    currentdata,
                    alldata: [PreBetdata],
                    tickets,
                    betId,
                    userId: user.userId,
                    level,
                    membership: user.membership,
                    timestamp: Date.now(),
                    isBatch: true
                });

                break; // success → exit retry loop
            }
        }
    }, timeLine);
};