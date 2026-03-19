import User from "../../models/User.js";
import Bet_TierA from "../../models/Bet_TierA.js";
import Bet_TierB from "../../models/Bet_TierB.js";
import Bet_TierC from "../../models/Bet_TierC.js";
import BetTicket from "../../models/BetTicket.js";
import RealTimeWinner from "../../models/RealTimeWinner.js";
import * as Random from "../../math.randomfunctions/randomResult.js";
import { getChannel } from "../ably.service.js";
import { startBetEngine } from "./betEngine.service.js";
import { betLogic } from "./betResultLogic/index.js";

// let totalLevel = 0;

export const runBetResults = async (ably, level) => {
    let realBet;
    if (level === 0) realBet = await Bet_TierA.findOne().sort({ betId: -1 }).lean();
    if (level === 1) realBet = await Bet_TierB.findOne().sort({ betId: -1 }).lean();
    if (level === 2) realBet = await Bet_TierC.findOne().sort({ betId: -1 }).lean();

    const realBetId = realBet ? realBet.betId : 1;
    // Get latest bet and users
    const bettickets = await BetTicket
        .findOne({ level, betId: realBetId })
        .sort({ betId: -1 })
        .lean();

    let betearnhistory;
    if (level === 0) betearnhistory = await Bet_TierA.findOne({betId: realBetId}).lean();
    if (level === 1) betearnhistory = await Bet_TierB.findOne({betId: realBetId}).lean();
    if (level === 2) betearnhistory = await Bet_TierC.findOne({betId: realBetId}).lean();

    if (!bettickets || !Array.isArray(bettickets.ticketHolder)) {return}

    // totalLevel = level;

    const users = await User.find({}, { altas: 1, userId: 1, _id: 0 }).lean();

    const betticketsHolder = bettickets.ticketHolder;

    const result = await betLogic(betticketsHolder, level);

    const mapTicketToUser = (tickets) => {
        return tickets.map(ticket => {
            const userId = Random.getUserIdByTicket(betticketsHolder, ticket);
            const altas = Random.getAltasFromArray(users, userId);
            const isUser = Random.getIsUserByTicket(betticketsHolder, ticket);
            return { ticket, userId, altas, isUser };
        });
    };

    const betOneWinners = mapTicketToUser(result.firstgradNumber);
    const betTwoWinners = mapTicketToUser(result.secondgradNumber);
    const betThreeWinners = mapTicketToUser(result.thirdgradNumber);
    const betFourWinners = mapTicketToUser(result.forthgradNumber);
    const betFiveWinners = mapTicketToUser(result.fifthgradNumber);
    const betSixWinners = mapTicketToUser(result.sixthgradNumber);
    const betSevenWinners = mapTicketToUser(result.seventhgradNumber);

    // Save results 
    var bet
    if(level == 0) bet = await Bet_TierA.findOne().sort({ betId: -1 });
    if(level == 1) bet = await Bet_TierB.findOne().sort({ betId: -1 });
    if(level == 2) bet = await Bet_TierC.findOne().sort({ betId: -1 });
    const now = Math.floor(Date.now() / 1000);

    const buildBetResult = (winners = []) => ({
        winNum: winners.map(w => w.ticket),
        winUsername: winners.map(w => w.altas),
        winUserId: winners.map(w => w.userId),
    });

    const winUsersResult = (winUsers = []) => (
        winUsers.map(w => w.userId)
    )

    const winUsers = winUsersResult(bettickets.ticketHolder);

    bet.betEndTime = now;
    bet.betDuration = now - bet.betStartTime;
    bet.betResult = {
        betOne: buildBetResult(betOneWinners),
        betTwo: buildBetResult(betTwoWinners),
        betThree: buildBetResult(betThreeWinners),
        betFour: buildBetResult(betFourWinners),
        betFive: buildBetResult(betFiveWinners),
        betSix: buildBetResult(betSixWinners),
        betSeven: buildBetResult(betSevenWinners),
    };


    // winner select
    selectWinner(bet, level);
    
    const allWinners = [
        { winners: betOneWinners, multiplier: 160, bonus: [0, 10, 150] },
        { winners: betTwoWinners, multiplier: 80, bonus: [0, 0, 0] },
        { winners: betThreeWinners, multiplier: 40, bonus: [0, 0, 0] },
        { winners: betFourWinners, multiplier: 20, bonus: [0, 0, 0] },
        { winners: betFiveWinners, multiplier: 10, bonus: [0, 0, 0] },
        { winners: betSixWinners, multiplier: 1, bonus: [0, 0, 0] },
    ];

    var userEarn = 0;
    var ticketEarn = 0;
    var userTickets = 0;
    
    const factor = level === 0 ? 1 : level === 1 ? 5 : 50;
    
    // Aggregate winnings per user first
    const userWinnings = {};
    
    allWinners.forEach(group => {
        group.winners.forEach(winner => {
            const isUser = betticketsHolder.filter(item => item.userId == winner.userId)[0]?.isUser || 0;
            if(isUser == 1) {
                const amount = (Number(group.multiplier * factor) + Number(group.bonus[level]*10))/10;
                userEarn += amount;
                
                if(!userWinnings[winner.userId]) {
                    userWinnings[winner.userId] = 0;
                }
                userWinnings[winner.userId] += amount;
            } else {
                // Non-user updates can still be done individually
                User.updateOne(
                    { userId: winner.userId },
                    { $inc: { totalEarn: Number(group.multiplier * factor / 10)} }
                ).catch(err => console.error('Error updating non-user:', err));
            }
        });
    });
    
    // Now update each user once with their total winnings
    await Promise.all(Object.entries(userWinnings).map(async ([userId, totalAmount]) => {
        await User.updateOne(
            { userId: userId },
            { 
                $inc: { 
                    totalEarn: totalAmount, 
                    balance: totalAmount 
                },
                $push: {
                    totalhistory: {
                        amount: totalAmount,
                        date: new Date(),
                        type: "numexa"
                    }
                }
            }
        );
        
        await User.updateOne(
            { 
                userId: userId,
                bethistory: { 
                    $elemMatch: { 
                        betId: bet.betId, 
                        tier: level 
                    } 
                }
            },
            { 
                $inc: {
                    'bethistory.$.win': totalAmount
                },
            }
        );
    }));

    bettickets.ticketHolder.map(item => {
        if(item.isUser == 1) {
            ticketEarn += factor*item.ticketCnt;
            userTickets += item.ticketCnt
        }
    })

    
    const revenu = Math.round((ticketEarn - userEarn)*100)/100;
    
    bet.betRevenue = revenu;
    bet.sellTicketCnt = userTickets;

    await bet.save().then(async() => {
        console.log("✅ BET END", bet.betId, "level", level, "Duration", bet.betDuration);
    
        const channel = await getChannel(ably, "NumBanco");
    
        await channel.publish("BET_END", { betId: "Bet ended", level, betearnhistory });
        await channel.publish("GET_INFO", winUsers);

        startBetEngine(ably, level);
    })
};

// / calculate the Winner in this bet

const PRIZE_TABLE = [
    { count: 1, prize: 16 },
    { count: 2, prize: 8 },
    { count: 3, prize: 4 },
    { count: 10, prize: 2 },
    { count: 20, prize: 1 },
    { count: 30, prize: 0.1 }
];


function selectWinner(bet, level) {
    const tickets = extractRankedTickets(bet);
    const payouts = assignPrizes(tickets);
    const results = calculateEarnings(payouts);
    const price = level == 0 ? 1 : (level == 1 ? 5 : 50);

    
    User.findOne({userId: results[0].userId})
    .then(user => {
        if(user) {
            const winner = new RealTimeWinner({
                username: user.altas,
                level: level,
                earn: results[0].total*price/10,
                betId: bet.betId,
                avatar: user.avatar,
                membership: user.membership,
                time: Date.now()
            })
            winner.save();
        }
    });
}

function extractRankedTickets(bet) {
    const order = ['betOne', 'betTwo', 'betThree', 'betFour', 'betFive', 'betSix'];
    const tickets = [];

    for (const key of order) {
        const group = bet.betResult[key];
        if (!group || !Array.isArray(group.winUserId)) continue;

        for (const userId of group.winUserId) {
            tickets.push({ userId }); // keep UUID as string
        }
    }
    return tickets;
}

function assignPrizes(tickets) {
    const payouts = [];
    let index = 0;

    for (const tier of PRIZE_TABLE) {
        for (let i = 0; i < tier.count; i++) {
            if (!tickets[index]) break;

            payouts.push({
                userId: tickets[index].userId,
                prize: tier.prize
            });

            index++;
        }
    }
    return payouts;
}

function calculateEarnings(payouts) {
    const earnings = {};
    for (const { userId, prize } of payouts) {
        earnings[userId] = (earnings[userId] || 0) + prize*10;
    }
    return Object.entries(earnings)
        .map(([userId, total]) => ({ userId, total })) // keep userId as string
        .sort((a, b) => b.total - a.total);
}