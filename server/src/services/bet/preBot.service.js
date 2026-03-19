import User from "../../models/User.js";
import BetTicket from "../../models/BetTicket.js";
import * as Random from "../../math.randomfunctions/randomPre.js";
import { getChannel } from "../ably.service.js";

export const runPreBots = async (ably, betId, level) => {
    const randomBetId = Random.randomBetId(betId);
    let match = { partnerLevel: 0 };
    if (level === 1) match.membership = { $in: [1, 2] };
    if (level === 2) match.membership = 2;
    const users = await User.aggregate([
        { $match: match },
        { $sample: { size: 1 } },
        { $project: { _id: 0, userId: 1, membership: 1, altas: 1 } }
    ]);
    if (!users.length) return;

    const user = users[0];

    const randomTicketCnt = Random.randomTicket(user.membership);
    const randomTickets = Random.getUniqueRandomNumbers(randomTicketCnt);
    const betticket = await BetTicket.findOne({ betId: randomBetId, level: level });

    
    if(betticket) return;
    console.log("🚀 Run pre bet level:", level, "Bet Id", randomBetId, "Cnt", randomTicketCnt);

    const newBetTicket = new BetTicket({
        betId: randomBetId,
        level: level,
        sellTicket: randomTickets,
        sellTicketCnt: randomTicketCnt,
        ticketHolder: [{
            altas: user.altas,
            userId: user.userId,
            ticketCnt: randomTicketCnt,
            ticket: randomTickets,
            isUser: 0
        }]
    });
    await newBetTicket.save();



    const currentdata = await BetTicket.findOne({
        betId: betId,
        level: level
    }).lean();
    const PreBetdata = await BetTicket.find({ betId: { $gt: betId }, level: level }, { betId: 1, sellTicketCnt: 1}).lean();

    const channel = await getChannel(ably, "Num2Bet");
    await channel.publish("ticketSold", {
        currentdata: currentdata,
        alldata: [PreBetdata],
        betId,
        userId: user.userId,
        membership: user.membership,
        level,
        timestamp: Date.now(),
        isBatch: true
    });
    return true;
};