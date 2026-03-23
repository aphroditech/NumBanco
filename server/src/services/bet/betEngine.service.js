import cron from "node-cron";
import Bet_TierA from "../../models/numBanco/Bet_TierA.js";
import Bet_TierB from "../../models/numBanco/Bet_TierB.js";
import Bet_TierC from "../../models/numBanco/Bet_TierC.js";
import BetTicket from "../../models/numBanco/BetTicket.js";
import Setting from "../../models/Setting.js";
import { getChannel } from "../ably.service.js";
import { runBetBots } from "./betBot.service.js";
import { runBetResults } from "./betResult.service.js";
import { runPreBots } from "./preBot.service.js";
import * as Random from "../../math.randomfunctions/randomPre.js";

export const startBetEngine = async (ably, level) => {
    const channel = await getChannel(ably, "NumBanco");

    let lastBet;
    if (level == 0) lastBet = await Bet_TierA.findOne().sort({ betId: -1 }).lean();
    if (level == 1) lastBet = await Bet_TierB.findOne().sort({ betId: -1 }).lean();
    if (level == 2) lastBet = await Bet_TierC.findOne().sort({ betId: -1 }).lean();

    const betId = lastBet ? (lastBet.betEndTime ? lastBet.betId + 1 : lastBet.betId) : 1;
    const startTime = Math.floor(Date.now() / 1000);

    if ((level == 0 && lastBet && lastBet.betEndTime) || (level == 0 && !lastBet)) {
        await Bet_TierA.create({ betId, betResult: {}, betStartTime: startTime });
    }

    if ((level == 1 && lastBet && lastBet.betEndTime) || (level == 1 && !lastBet)) {
        await Bet_TierB.create({ betId, betResult: {}, betStartTime: startTime });
    }

    if ((level == 2 && lastBet && lastBet.betEndTime) || (level == 2 && !lastBet)) {
        await Bet_TierC.create({ betId, betResult: {}, betStartTime: startTime });
    }

    const betticket = await BetTicket.findOne({ betId, level });

    if (!betticket) {
        await BetTicket.create({
            betId,
            level,
            sellTicket: [],
            sellTicketCnt: 0,
            ticketHolder: [],
            membership: 0
        });
    }

    await channel.publish("BET_START", {
        betId,
        betStartTime: startTime,
        level
    });

    console.log("✅ BET START------------------>", betId, "level", level);

    const setting = await Setting.find({});
    let turn = 6;
    if (level == 0) turn = setting[0].botAPerBet;
    if (level == 1) turn = setting[0].botBPerBet;
    if (level == 2) turn = setting[0].botCPerBet;
    // if (level == 0) turn = Math.floor(Math.random() * (setting[0].botAPerBet - 1 + 1)) + 1;
    // if (level == 1) turn = Math.floor(Math.random() * (setting[0].botBPerBet - 1 + 1)) + 1;
    // if (level == 2) turn = Math.floor(Math.random() * (setting[0].botCPerBet - 1 + 1)) + 1;

    for (let i = 1; i <= turn; i++) {
        runBetBots(ably, betId, level, turn, i);
    }

    // ============================
    // 🔁 END BET (CRON VERSION)
    // ============================

    let betEnded = false;

    const task = cron.schedule(
        "* * * * * *", // every 1 second (cron minimum)
        async () => {
            if (betEnded) return;

            let realBet;
            if (level === 0) realBet = await Bet_TierA.findOne().sort({ betId: -1 }).lean();
            if (level === 1) realBet = await Bet_TierB.findOne().sort({ betId: -1 }).lean();
            if (level === 2) realBet = await Bet_TierC.findOne().sort({ betId: -1 }).lean();

            const realBetId = realBet ? realBet.betId : 1;

            const realtimeBetticket = await BetTicket.findOne({
                betId: realBetId,
                level
            });

            if (
                realtimeBetticket?.sellTicketCnt >= 100 ||
                realtimeBetticket?.sellTicket?.length >= 100
            ) {
                betEnded = true;

                task.stop(); // 🔥 CRON equivalent of clearInterval

                runBetResults(ably, level);
            }
        },
        { scheduled: true }
    );
};

// export const endBetEngine = async (ably, level) => {
//     runBetResults(ably, level);
// };
