import UpDownRound from "../../models/UpDownRound.js";
import UpDownBet from "../../models/UpDownBet.js";
import User from "../../models/User.js";
import GravityHistory from "../../models/GravityHistory.js";

/**
 * Process results for UpDown game after trading phase ends
 * Logic: The side with SMALLER total amount bet WINS
 * 
 * @param {number} roundId - The round ID to process
 * @param {number} upTotalBet - Total amount bet on UP
 * @param {number} downTotalBet - Total amount bet on DOWN
 * @returns {Promise<Object>} Result with winner info and updated user data
 */
export async function processUpDownResult(roundId, upTotalBet, downTotalBet) {
  try {
    // console.log(`[UpDown Result] Processing round ${roundId}. Up: $${upTotalBet}, Down: $${downTotalBet}`);

    // Determine winner: smaller side wins
    let winnerSide;
    let loserSide;
    let winningAmount;
    let losingAmount;

    if (upTotalBet < downTotalBet) {
      winnerSide = "up";
      loserSide = "down";
      winningAmount = upTotalBet;
      losingAmount = downTotalBet;
    } else if (downTotalBet < upTotalBet) {
      winnerSide = "down";
      loserSide = "up";
      winningAmount = downTotalBet;
      losingAmount = upTotalBet;
    } else {
      if (Math.random() > 0.5) {
        winnerSide = "up";
        loserSide = "down";
        winningAmount = upTotalBet;
        losingAmount = downTotalBet;
      } else {
        winnerSide = "down";
        loserSide = "up";
        winningAmount = downTotalBet;
        losingAmount = upTotalBet;
      }
    }
    const betDoc = await UpDownBet.findOne({ roundId });
    if (!betDoc) {
      // console.log(`[UpDown Result] No bets found for round ${roundId}`);
      return { roundId, status: "no_bets" };
    }

    // Separate winners and losers
    const winners = betDoc.user.filter((u) => u.direction === winnerSide);
    const losers = betDoc.user.filter((u) => u.direction === loserSide);

    // console.log(`[UpDown Result] Round ${roundId}: ${winners.length} winners, ${losers.length} losers`);

    // Payout winners: winners receive double their bet amount
    const totalPool = upTotalBet + downTotalBet;
    const updatedUsers = betDoc.user.map((u) => {
      const isWinner = u.direction === winnerSide;
      return { ...u.toObject ? u.toObject() : u, isWinner };
    });

    // Aggregate payouts by userId so each user is paid once (handles multiple bets per user)
    const payoutMap = new Map(); // userId -> { userId, userName, totalBet, totalPayout }
    for (const u of updatedUsers) {
      if (!u.isWinner) continue;
      const uid = String(u.userId);
      const betAmt = Number(u.amount || 0);
      const payout = betAmt * 2;
      if (!payoutMap.has(uid)) {
        payoutMap.set(uid, { userId: u.userId, userName: u.altas, totalBet: betAmt, totalPayout: payout });
      } else {
        const entry = payoutMap.get(uid);
        entry.totalBet += betAmt;
        entry.totalPayout += payout;
        payoutMap.set(uid, entry);
      }
    }

    const winnersInfo = [];
    // Persist payouts per user (one DB update per winning user)
    for (const [, entry] of payoutMap) {
      try {
        // User documents use `userId` (UUID string) field, so update by that field
        await User.findOneAndUpdate({ userId: entry.userId }, { $inc: { balance: entry.totalPayout } });
        winnersInfo.push({ userId: entry.userId, userName: entry.userName, amount: entry.totalBet, payout: entry.totalPayout, profit: entry.totalPayout - entry.totalBet });
        // console.log(`[UpDown Result] Winner ${entry.userId}: total bet $${entry.totalBet}, total payout $${entry.totalPayout}, profit ${entry.totalPayout - entry.totalBet}`);
      } catch (e) {
        console.error(`[UpDown Result] Failed to pay user ${entry.userId}:`, e);
      }
    }

    // Update GravityHistory with winAmount for all users in this round
    for (const u of betDoc.user) {
      const uid = String(u.userId);
      const payout = payoutMap.has(uid) ? payoutMap.get(uid).totalPayout : 0;
      try {
        await GravityHistory.findOneAndUpdate(
          { roundId, userId: uid },
          { $set: { winAmount: payout } }
        );
      } catch (e) {
        console.error(`[UpDown Result] Failed to update GravityHistory for round ${roundId} user ${uid}:`, e);
      }
    }

    // Update UpDownBet document: set per-bet isWinner flags and summary payout/multiplier
    await UpDownBet.findOneAndUpdate(
      { roundId },
      {
        $set: {
          user: updatedUsers,
          payout: winnersInfo.reduce((s, w) => s + (w.payout || 0), 0),
          multiplier: winnersInfo.length > 0 ? (winnersInfo.reduce((s, w) => s + (w.payout || 0), 0) / (winnersInfo.reduce((s, w) => s + (w.amount || 0), 0) || 1)) : 0,
          multiplier: winnersInfo.length > 0 ? (winnersInfo.reduce((s, w) => s + (w.payout || 0), 0) / (winnersInfo.reduce((s, w) => s + (w.amount || 0), 0) || 1)) : 0,
          status: "completed"
        }
      }
    );

    // Persist the winner choice into the round so frontend and DB agree (override graph-based result)
    await UpDownRound.findOneAndUpdate(
      { roundId },
      {
        $set: {
          result: winnerSide,
          winnerSide,
          loserSide,
          upTotalBet: upTotalBet || 0,
          downTotalBet: downTotalBet || 0,
        },
      }
    );

    return {
      roundId,
      status: "completed",
      winnerSide,
      loserSide,
      totalPool,
      winnerCount: winners.length,
      loserCount: losers.length,
      winners: winnersInfo,
      losers: losers.map((l) => ({ userId: l.userId, userName: l.altas, amount: l.amount }))
    };
  } catch (err) {
    console.error(`[UpDown Result] Error processing round ${roundId}:`, err);
    // throw err;
    return;
  }
}

/**
 * Refund all bets when amounts are equal
 */
async function refundAllBets(roundId) {
  try {
    const betDoc = await UpDownBet.findOne({ roundId });
    if (!betDoc) return { roundId, status: "no_bets" };

    for (const bet of betDoc.user) {
      const { userId, amount } = bet;
      // Refund the bet amount (they get their money back) - update by `userId` field
      await User.findOneAndUpdate({ userId }, { $inc: { balance: amount } });
    }

    await UpDownBet.findOneAndUpdate(
      { roundId },
      { status: "refunded" }
    );

    // console.log(`[UpDown Result] Round ${roundId}: Refunded all bets (equal amounts)`);

    return {
      roundId,
      status: "refunded",
      refundCount: betDoc.user.length
    };
  } catch (err) {
    console.error(`[UpDown Result] Error refunding round ${roundId}:`, err);
    // throw err;
    return;
  }
}

