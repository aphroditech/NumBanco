import User from "../../models/User.js";
import HashDiceResult from "../../models/hashDice/HashDiceResult.js";
import HashDiceBotSettings from "../../models/hashDice/HashDiceBotSettings.js";
import HashDiceSetting from "../../models/hashDice/HashDiceSetting.js";
import {
  getBaseWinRateForPayout,
  hashThresholdsFromPayout,
  pickDisplayRoll,
} from "./hashDiceGame.service.js";
import { trimHashDiceResultsCollection } from "./hashDiceResult.service.js";

const MIN_BET = 0.1;
const MAX_BET = 20;
const PAYOUT_CHOICES = [1.01, 1.2, 1.5, 2, 2.5, 3, 4, 5, 8];

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

async function getResolvedBotSettings() {
  let doc = await HashDiceBotSettings.findOne({}).lean();
  if (!doc) {
    const created = await HashDiceBotSettings.create({
      winBotRate: 0.38,
      loseBotRate: 0.38,
      botRunIntervalMs: 3200,
    });
    return created.toObject();
  }
  return doc;
}

function randomBetAmount() {
  return round2(MIN_BET + Math.random() * (MAX_BET - MIN_BET));
}

function pickBot(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

async function runOneBotRound(ably, botPool) {
  const botS = await getResolvedBotSettings();
  const gameS = await HashDiceSetting.findOne({}).lean();
  if (!gameS) return;

  const pick = pickBot(botPool);
  const user = await User.findOne({ userId: pick.userId }).select("userId altas avatar").lean();
  if (!user) return;

  const betAmount = randomBetAmount();
  const payout = PAYOUT_CHOICES[Math.floor(Math.random() * PAYOUT_CHOICES.length)];
  const side = Math.random() < 0.5 ? 0 : 1;

  const winR = Number(botS.winBotRate) || 0.35;
  const loseR = Number(botS.loseBotRate) || 0.35;
  const u = Math.random();
  const baseWin = getBaseWinRateForPayout(payout, gameS.winRateBands);

  let isWin;
  if (u < winR) isWin = true;
  else if (u < winR + loseR) isWin = false;
  else isWin = Math.random() < baseWin;

  const grossWin = isWin ? round4(betAmount * payout) : 0;
  const profit = round4(grossWin - betAmount);
  const { lowBelow, highAbove } = hashThresholdsFromPayout(payout);
  const roll = pickDisplayRoll(side, isWin, lowBelow, highAbove);
  const multDisplay = isWin ? payout : 0;

  const doc = await HashDiceResult.create({
    userId: String(user.userId ?? ""),
    userName: user.altas || "Player",
    avatar: user.avatar || "",
    betAmount,
    multiplier: multDisplay,
    win: grossWin,
    profit,
    payout,
    side,
    roll,
    isBot: true,
  });

  await trimHashDiceResultsCollection();

  if (ably) {
    try {
      const channel = ably.channels.get("hashDiceLive");
      await channel.publish("HASH_DICE_LIVE_ROW", {
        id: doc._id.toString(),
        userId: String(user.userId),
        user: user.altas || "Player",
        avatar: user.avatar || "",
        betAmount,
        multiplier: multDisplay,
        win: grossWin,
        profit,
      });
    } catch (e) {
      console.warn("[hashDiceBot] ably", e.message);
    }
  }
}

/**
 * Synthetic rounds → `HashDiceResult` + Ably `hashDiceLive` / `HASH_DICE_LIVE_ROW` (Plinko-style).
 */
export async function hashDiceBot(ably) {
  const botPool = await User.find({ partnerLevel: 0 }).select("userId").lean();
  if (!botPool?.length) {
    console.warn("[hashDiceBot] No partnerLevel:0 users — bot feed disabled");
    return;
  }

  const scheduleNext = async () => {
    try {
      const s = await getResolvedBotSettings();
      const ms = Math.max(800, Number(s.botRunIntervalMs) || 3200);
      await runOneBotRound(ably, botPool);
      setTimeout(scheduleNext, ms);
    } catch (err) {
      console.error("[hashDiceBot]", err?.message || err);
      setTimeout(scheduleNext, 5000);
    }
  };

  scheduleNext();
}
