import crypto from "crypto";
import HashDiceSetting from "../../models/hashDice/HashDiceSetting.js";
import User from "../../models/User.js";

const MIN_PAYOUT = 1.01;
const MAX_PAYOUT = 100;

let settingsCache = null;
let settingsCacheAt = 0;
const SETTINGS_TTL_MS = 5000;

export async function refreshHashDiceSettingsCache() {
  settingsCache = await HashDiceSetting.findOne({}).lean();
  settingsCacheAt = Date.now();
}

async function getSettings() {
  if (!settingsCache || Date.now() - settingsCacheAt > SETTINGS_TTL_MS) {
    await refreshHashDiceSettingsCache();
  }
  return settingsCache;
}

/**
 * Resolve configured win rate from bands (supports closedUpper for [5,10], openLower for (10, max]).
 */
export function getBaseWinRateForPayout(payout, bands) {
  const p = Number(payout);
  if (!Number.isFinite(p) || p < MIN_PAYOUT) return 0;
  const list = Array.isArray(bands) && bands.length > 0 ? bands : [];
  const sorted = [...list].sort((a, b) => Number(a.min) - Number(b.min));

  for (const b of sorted) {
    const lo = Number(b.min);
    const hi = Number(b.max);
    const r = Number(b.winRate);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(r)) continue;
    const rate = Math.max(0, Math.min(1, r));
    if (b.openLower === true) {
      if (p > lo && p <= hi) return rate;
      continue;
    }
    if (b.closedUpper === true) {
      if (p >= lo && p <= hi) return rate;
      continue;
    }
    if (p >= lo && p < hi) return rate;
  }
  return 0;
}

/** Match client HashDicePage zone / thresholds for consistent display rolls. */
export function zoneCountFromPayout(payoutVal) {
  const p = Number(payoutVal);
  if (!Number.isFinite(p) || p < MIN_PAYOUT) return 50000;
  const capped = Math.min(p, MAX_PAYOUT);
  const raw = Math.round((100000 / capped) * 0.98);
  return Math.max(1, Math.min(99999, raw));
}

export function hashThresholdsFromPayout(payoutVal) {
  const zone = zoneCountFromPayout(payoutVal);
  return { lowBelow: zone, highAbove: 99999 - zone };
}

export function getEffectiveWinRate(baseWinRate, hashMode, settingDoc) {
  const base = Math.max(0, Math.min(1, Number(baseWinRate) || 0));
  if (hashMode !== 1) return base;
  const t = Number(settingDoc?.hashModeWinMultTight ?? 0.7);
  const s = Number(settingDoc?.hashModeWinMultSoft ?? 0.8);
  const f1 = Number.isFinite(t) ? Math.max(0, t) : 0.7;
  const f2 = Number.isFinite(s) ? Math.max(0, s) : 0.8;
  return Math.max(0, Math.min(1, base * f1 * f2));
}

/**
 * After updating hashBetAmount / hashWinAmount, bump hashMode like Mines:
 * 0 → 1 when wins exceed enter ratio × bets; 1 → 0 when wins drop below exit ratio × bets.
 */
export async function updateHashMode(userSelector) {
  if (!userSelector) return;
  const setting = await getSettings();
  const enterR = Number(setting?.hashModeEnterProfitRatio ?? 1.2);
  const exitR = Number(setting?.hashModeExitLossRatio ?? 0.8);

  const user = await User.findOne(userSelector)
    .select("hashMode hashBetAmount hashWinAmount")
    .lean();
  if (!user) return;

  const bet = Number(user.hashBetAmount) || 0;
  const win = Number(user.hashWinAmount) || 0;
  let mode = user.hashMode === 1 ? 1 : 0;
  let newMode = mode;

  if (mode === 0 && win > bet * enterR) newMode = 1;
  else if (mode === 1 && win < bet * exitR) newMode = 0;

  if (newMode !== mode) {
    await User.findOneAndUpdate(userSelector, { $set: { hashMode: newMode } });
  }
}

function randomInt(min, maxInclusive) {
  return crypto.randomInt(min, maxInclusive + 1);
}

/**
 * Pick a roll 0..99999 consistent with side (0=Low, 1=High) and win/loss vs thresholds.
 */
/**
 * At least one loss every N bets ⇒ cap consecutive wins at N−1.
 * @param consecutiveWins wins since last loss (before this bet resolves)
 * @param nBets HashDiceSetting.hashMinLossEveryNBets; values &lt; 2 disable the rule.
 */
export function mustForceLossBeforeBet(consecutiveWins, nBets) {
  const n = Math.floor(Number(nBets) || 0);
  if (!Number.isFinite(n) || n < 2) return false;
  const c = Math.max(0, Math.floor(Number(consecutiveWins) || 0));
  return c >= n - 1;
}

export function pickDisplayRoll(side, isWin, lowBelow, highAbove) {
  const lb = Math.max(1, Math.min(99998, lowBelow));
  const ha = Math.max(1, Math.min(99998, highAbove));
  if (side === 0) {
    if (isWin) return randomInt(0, lb - 1);
    return randomInt(lb, 99999);
  }
  // High
  if (isWin) return randomInt(ha + 1, 99999);
  return randomInt(0, ha);
}

export { MIN_PAYOUT, MAX_PAYOUT };
