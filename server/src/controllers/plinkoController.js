import User from "../models/User.js";
import PlinkoResult from "../models/plinko/PlinkoResult.js";
import CalendarPlinko from "../models/plinko/CalendarPlinko.js";
import PlinkoRateSettings from "../models/plinko/PlinkoRateSettings.js";
import PlinkoBotSettings from "../models/plinko/PlinkoBotSettings.js";
import {
  getPlinkoMultipliers,
  pathForSlot,
  getMidBucketBandPercentFromWeights,
} from "../services/plinko/plinkoMultipliers.js";
import {
  rollPlinkoSlotFromConfig,
  invalidatePlinkoRatesCache,
  getEffectiveSlotWeightsForRows,
  getEffectiveMultipliersForRows,
  parseStoredSlotEntries,
  rowUsesDatabaseBands,
  rowUsesDatabaseSlotEntries,
  rowUsesDatabaseWeights,
  rowUsesDatabaseMultipliers,
} from "../services/plinko/plinkoRates.service.js";
import {
  getPlinkoBotSettingsRaw,
  invalidatePlinkoBotSettingsCache,
  parseAndValidateBotMultiplierBands,
} from "../services/plinko/plinkoBotSettings.service.js";

const MIN_BET = 0.5;
const MAX_BET = 20;
const ROW_MIN = 8;
const ROW_MAX = 16;

/** Plinko uses a single multiplier ladder (regular). */
const PLINKO_RISK = "regular";

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Mines-style [{ min, max, probability }, …] per row key. */
function validateMultiplierBandsRow(bands, keyLabel) {
  if (!Array.isArray(bands) || bands.length === 0) {
    return { ok: false, error: `multiplierBandsByRows["${keyLabel}"] must be a non-empty array` };
  }
  const out = [];
  let sum = 0;
  for (const b of bands) {
    const min = toNum(b.min);
    const max = toNum(b.max);
    const p = Math.max(0, toNum(b.probability));
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { ok: false, error: `multiplierBandsByRows["${keyLabel}"]: invalid min/max` };
    }
    out.push({ min, max, probability: p });
    sum += p;
  }
  if (sum <= 0) {
    return { ok: false, error: `multiplierBandsByRows["${keyLabel}"]: probability sum must be > 0` };
  }
  return { ok: true, bands: out };
}

/** Per bucket: { multiplier, rate } (alias `weight` → rate). Length row+1. */
function validateSlotEntriesRow(arr, keyLabel, r) {
  if (!Array.isArray(arr) || arr.length !== r + 1) {
    return {
      ok: false,
      error: `slotEntriesByRows["${keyLabel}"] must be an array of length ${r + 1}`,
    };
  }
  const entries = [];
  let wSum = 0;
  for (const raw of arr) {
    const multiplier = toNum(raw?.multiplier);
    const rate = Math.max(0, toNum(raw?.rate ?? raw?.weight));
    entries.push({ multiplier, rate });
    wSum += rate;
  }
  if (!entries.some((e) => e.multiplier > 0)) {
    return {
      ok: false,
      error: `slotEntriesByRows["${keyLabel}"]: at least one multiplier must be > 0`,
    };
  }
  if (wSum <= 0) {
    return {
      ok: false,
      error: `slotEntriesByRows["${keyLabel}"]: at least one landing rate must be > 0`,
    };
  }
  return { ok: true, entries };
}

/** Admin/config: one `{ multiplier, rate }` per slot — from `slotEntriesByRows` or legacy zip. */
function materializeSlotEntriesByRows(doc) {
  const out = {};
  for (let r = ROW_MIN; r <= ROW_MAX; r += 1) {
    const key = String(r);
    const stored = doc?.slotEntriesByRows?.[key];
    if (parseStoredSlotEntries(stored, r)) {
      out[key] = stored.map((item) => ({
        multiplier: toNum(item?.multiplier),
        rate: Math.max(0, toNum(item?.rate ?? item?.weight)),
      }));
      continue;
    }
    const w = doc?.slotPercentsByRows?.[key];
    const m = doc?.slotMultipliersByRows?.[key];
    if (Array.isArray(w) && w.length === r + 1 && Array.isArray(m) && m.length === r + 1) {
      out[key] = w.map((rate, i) => ({
        multiplier: toNum(m[i]),
        rate: Math.max(0, toNum(rate)),
      }));
    }
  }
  return out;
}

const plinkoUserSelect = {
  userId: 1,
  balance: 1,
  totalBet: 1,
  refreshBet: 1,
  lotterybet: 1,
  plinkoBetAmount: 1,
  plinkoWinAmount: 1,
  plinkoHistory: { $slice: -50 },
  avatar: 1,
  altas: 1,
  membership: 1,
};

function buildPlinkoCompactUser(user, overrides = {}) {
  const raw = typeof user?.toObject === "function" ? user.toObject() : { ...user };
  return {
    userId: raw.userId,
    balance: overrides.balance ?? raw.balance,
    totalBet: overrides.totalBet ?? raw.totalBet,
    refreshBet: overrides.refreshBet ?? raw.refreshBet,
    lotterybet: overrides.lotterybet ?? raw.lotterybet,
    plinkoBetAmount: overrides.plinkoBetAmount ?? raw.plinkoBetAmount ?? 0,
    plinkoWinAmount: overrides.plinkoWinAmount ?? raw.plinkoWinAmount ?? 0,
    plinkoHistory: overrides.plinkoHistory ?? raw.plinkoHistory ?? [],
    avatar: raw.avatar,
    altas: raw.altas,
    membership: raw.membership,
  };
}

export const postPlinkoBet = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const numBet = round2(toNum(req.body?.betAmount ?? req.body?.amount));
    const rowCount = Math.round(toNum(req.body?.rows));
    const hyperMode = Boolean(req.body?.hyperMode);

    if (numBet < MIN_BET || numBet > MAX_BET) {
      return res.status(400).json({ error: `Bet must be between ${MIN_BET} and ${MAX_BET}` });
    }
    if (rowCount < ROW_MIN || rowCount > ROW_MAX) {
      return res.status(400).json({ error: "Rows must be between 8 and 16" });
    }

    const user = await User.findOne({ userId }, plinkoUserSelect).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const bal = round2(toNum(user.balance));
    if (numBet > bal) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const riskKey = PLINKO_RISK;
    const multipliers = await getEffectiveMultipliersForRows(rowCount);
    const slot = await rollPlinkoSlotFromConfig(rowCount);
    const mult = round2(toNum(multipliers[slot]));
    /** Full return each bet: stake × landed multiplier (balance net = payout − stake). */
    const payout = round2(numBet * mult);
    const profit = round2(payout - numBet);
    const pathSteps = pathForSlot(rowCount, slot);

    const roundId = Date.now();
    const historyEntry = {
      roundId,
      betAmount: numBet,
      winAmount: payout,
      profit,
      multiplier: mult,
      slot,
      rows: rowCount,
      risk: riskKey,
      pathSteps,
      hyperMode,
      createAt: new Date(),
    };

    const balanceDelta = round2(payout - numBet);
    const nextBalance = round2(bal + balanceDelta);

    const updateResult = await User.updateOne(
      { userId, balance: { $gte: numBet } },
      {
        $inc: {
          balance: balanceDelta,
          totalBet: numBet,
          refreshBet: numBet,
          lotterybet: numBet,
          plinkoBetAmount: numBet,
          plinkoWinAmount: payout,
        },
        $push: {
          plinkoHistory: {
            $each: [historyEntry],
            $slice: -200,
          },
        },
      }
    );

    if (!updateResult?.matchedCount) {
      return res.status(409).json({ error: "Bet conflict or insufficient balance" });
    }

    Promise.resolve()
      .then(async () => {
        await PlinkoResult.create({
          userId: String(userId),
          userName: user.altas,
          avatar: user.avatar || "",
          betAmount: numBet,
          multiplier: mult,
          win: payout,
          profit,
          rows: rowCount,
          isBot: false,
        });
        await CalendarPlinko.create({
          userId: String(userId),
          userName: user.altas,
          avatar: user.avatar || "",
          betAmount: numBet,
          multiplier: mult,
          win: payout,
          profit,
          rows: rowCount,
          slot,
          roundId,
          risk: riskKey,
          hyperMode,
          pathSteps: Array.isArray(pathSteps) ? pathSteps : [],
        });
      })
      .catch((err) => console.error("[plinko] PlinkoResult / CalendarPlinko create", err));

    const prevHistory = Array.isArray(user.plinkoHistory) ? user.plinkoHistory : [];
    const mergedHistory = [...prevHistory, historyEntry].slice(-50);

    return res.status(200).json({
      message: "ok",
      data: {
        pathSteps,
        slot,
        multiplier: mult,
        payout,
        profit,
        rows: rowCount,
        risk: riskKey,
        hyperMode,
        roundId,
      },
      user: buildPlinkoCompactUser(user, {
        balance: nextBalance,
        totalBet: toNum(user.totalBet) + numBet,
        refreshBet: toNum(user.refreshBet) + numBet,
        lotterybet: toNum(user.lotterybet) + numBet,
        plinkoBetAmount: toNum(user.plinkoBetAmount) + numBet,
        plinkoWinAmount: toNum(user.plinkoWinAmount) + payout,
        plinkoHistory: mergedHistory,
      }),
    });
  } catch (error) {
    console.error("[plinko] postPlinkoBet", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

export const getMyPlinkoHistory = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await User.findOne({ userId }, { plinkoHistory: { $slice: -500 } }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ history: user.plinkoHistory || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

export const getPlinkoLiveResults = async (_req, res) => {
  try {
    /** Latest 13 from `PlinkoResult` (bots + real) for the live ticker. */
    const rows = await PlinkoResult.find().sort({ createdAt: -1 }).limit(13).lean();
    const data = rows.map((r) => ({
      id: r._id.toString(),
      userId: r.userId,
      user: r.userName,
      avatar: r.avatar,
      multiplier: r.multiplier,
      win: r.win,
      betAmount: r.betAmount,
      profit: typeof r.profit === "number" ? r.profit : r.win - (r.betAmount || 0),
    }));
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

/** Public: per-slot multiplier + landing % for current rows (uses DB weights when set). */
export const getPlinkoRates = async (req, res) => {
  try {
    const rowCount = Math.round(toNum(req.query.rows ?? 16));
    const n = Math.max(ROW_MIN, Math.min(ROW_MAX, rowCount));
    const riskKey = PLINKO_RISK;
    const weights = await getEffectiveSlotWeightsForRows(n);
    const mults = await getEffectiveMultipliersForRows(n);
    const sum = weights.reduce((a, b) => a + b, 0);
    const slots = weights.map((w, i) => ({
      slot: i,
      multiplier: mults[i],
      percent: sum > 0 ? Math.round((w / sum) * 10000) / 100 : 0,
    }));
    const midBandPercent = getMidBucketBandPercentFromWeights(n, weights);
    const fromDbBands = await rowUsesDatabaseBands(n);
    const fromDbEntries = await rowUsesDatabaseSlotEntries(n);
    const fromDbW = await rowUsesDatabaseWeights(n);
    const fromDbM = await rowUsesDatabaseMultipliers(n);
    const doc = await PlinkoRateSettings.findOne().select("updatedAt").lean();
    return res.json({
      rows: n,
      risk: riskKey,
      slots,
      midBandPercent,
      weightsSource: fromDbBands
        ? "bands"
        : fromDbEntries
          ? "slotEntries"
          : fromDbW
            ? "slotPercents"
            : "builtin",
      multipliersSource: fromDbM ? "database" : "builtin",
      ratesUpdatedAt: doc?.updatedAt ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

/** Authenticated: raw weights + multipliers per row for editing. */
export const getPlinkoRatesConfig = async (_req, res) => {
  try {
    const doc = await PlinkoRateSettings.findOne().lean();
    return res.json({
      slotEntriesByRows: materializeSlotEntriesByRows(doc || {}),
      multiplierBandsByRows:
        doc?.multiplierBandsByRows && typeof doc.multiplierBandsByRows === "object"
          ? doc.multiplierBandsByRows
          : {},
      slotPercentsByRows: doc?.slotPercentsByRows && typeof doc.slotPercentsByRows === "object"
        ? doc.slotPercentsByRows
        : {},
      slotMultipliersByRows: doc?.slotMultipliersByRows && typeof doc.slotMultipliersByRows === "object"
        ? doc.slotMultipliersByRows
        : {},
      updatedAt: doc?.updatedAt ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

/**
 * Merge-update any of: unified `slotEntriesByRows` [{ multiplier, rate }, …], Mines `multiplierBandsByRows`,
 * or legacy `slotPercentsByRows` / `slotMultipliersByRows`. At least one section required.
 * Saving unified entries for a row clears that row’s legacy parallel arrays; legacy PUT clears unified for that row.
 */
export const putPlinkoRates = async (req, res) => {
  try {
    const {
      slotEntriesByRows: entriesBody,
      slotPercentsByRows: pcBody,
      slotMultipliersByRows: multBody,
      multiplierBandsByRows: bandsBody,
    } = req.body;

    const hasEntries = entriesBody && typeof entriesBody === "object" && !Array.isArray(entriesBody);
    const hasPc = pcBody && typeof pcBody === "object" && !Array.isArray(pcBody);
    const hasMult = multBody && typeof multBody === "object" && !Array.isArray(multBody);
    const hasBands = bandsBody && typeof bandsBody === "object" && !Array.isArray(bandsBody);

    if (!hasEntries && !hasPc && !hasMult && !hasBands) {
      return res.status(400).json({
        error:
          "Provide at least one of: slotEntriesByRows, multiplierBandsByRows, slotPercentsByRows, slotMultipliersByRows",
      });
    }

    const existing = (await PlinkoRateSettings.findOne().lean()) || {};
    const prevW = existing.slotPercentsByRows && typeof existing.slotPercentsByRows === "object"
      ? { ...existing.slotPercentsByRows }
      : {};
    const prevM = existing.slotMultipliersByRows && typeof existing.slotMultipliersByRows === "object"
      ? { ...existing.slotMultipliersByRows }
      : {};
    const prevBands =
      existing.multiplierBandsByRows && typeof existing.multiplierBandsByRows === "object"
        ? { ...existing.multiplierBandsByRows }
        : {};
    const prevEntries =
      existing.slotEntriesByRows && typeof existing.slotEntriesByRows === "object"
        ? { ...existing.slotEntriesByRows }
        : {};

    if (hasPc) {
      const multIn = hasMult ? multBody : {};
      for (const key of Object.keys(pcBody)) {
        const r = parseInt(key, 10);
        if (!Number.isInteger(r) || r < ROW_MIN || r > ROW_MAX || String(r) !== key) {
          return res.status(400).json({ error: `Invalid row key "${key}" (use "8" through "16")` });
        }
        delete prevEntries[key];
        const arr = pcBody[key];
        if (!Array.isArray(arr) || arr.length !== r + 1) {
          return res.status(400).json({ error: `Row ${r} requires weights array of length ${r + 1}` });
        }
        const nums = arr.map((x) => Math.max(0, toNum(x)));
        if (!nums.some((x) => x > 0)) {
          return res.status(400).json({ error: `Row ${r}: at least one weight must be > 0` });
        }
        prevW[key] = nums;

        const mArr = multIn[key];
        if (mArr !== undefined) {
          if (!Array.isArray(mArr) || mArr.length !== r + 1) {
            return res.status(400).json({
              error: `Row ${r}: slotMultipliersByRows["${key}"] must be an array of length ${r + 1}`,
            });
          }
          const mnums = mArr.map((x) => toNum(x));
          if (!mnums.some((x) => x > 0)) {
            return res.status(400).json({ error: `Row ${r}: at least one multiplier must be > 0` });
          }
          prevM[key] = mnums;
        } else {
          prevM[key] =
            Array.isArray(prevM[key]) && prevM[key].length === r + 1
              ? prevM[key]
              : [...getPlinkoMultipliers(r, PLINKO_RISK)];
        }
      }
    }

    if (hasMult && !hasPc) {
      for (const key of Object.keys(multBody)) {
        const r = parseInt(key, 10);
        if (!Number.isInteger(r) || r < ROW_MIN || r > ROW_MAX || String(r) !== key) {
          return res.status(400).json({ error: `Invalid row key "${key}"` });
        }
        delete prevEntries[key];
        const mArr = multBody[key];
        if (!Array.isArray(mArr) || mArr.length !== r + 1) {
          return res.status(400).json({
            error: `Row ${r}: slotMultipliersByRows["${key}"] must be an array of length ${r + 1}`,
          });
        }
        const mnums = mArr.map((x) => toNum(x));
        if (!mnums.some((x) => x > 0)) {
          return res.status(400).json({ error: `Row ${r}: at least one multiplier must be > 0` });
        }
        prevM[key] = mnums;
      }
    }

    if (hasBands) {
      for (const key of Object.keys(bandsBody)) {
        const r = parseInt(key, 10);
        if (!Number.isInteger(r) || r < ROW_MIN || r > ROW_MAX || String(r) !== key) {
          return res.status(400).json({ error: `Invalid row key "${key}" (use "8" through "16")` });
        }
        const validated = validateMultiplierBandsRow(bandsBody[key], key);
        if (!validated.ok) {
          return res.status(400).json({ error: validated.error });
        }
        prevBands[key] = validated.bands;
      }
    }

    if (hasEntries) {
      for (const key of Object.keys(entriesBody)) {
        const r = parseInt(key, 10);
        if (!Number.isInteger(r) || r < ROW_MIN || r > ROW_MAX || String(r) !== key) {
          return res.status(400).json({ error: `Invalid row key "${key}" (use "8" through "16")` });
        }
        const validated = validateSlotEntriesRow(entriesBody[key], key, r);
        if (!validated.ok) {
          return res.status(400).json({ error: validated.error });
        }
        prevEntries[key] = validated.entries;
        delete prevW[key];
        delete prevM[key];
      }
    }

    const doc = await PlinkoRateSettings.findOneAndUpdate(
      {},
      {
        $set: {
          slotEntriesByRows: prevEntries,
          slotPercentsByRows: prevW,
          slotMultipliersByRows: prevM,
          multiplierBandsByRows: prevBands,
        },
      },
      { upsert: true, new: true }
    ).lean();

    invalidatePlinkoRatesCache();

    return res.json({
      message: "Plinko settings updated; they apply on the next bet.",
      slotEntriesByRows: materializeSlotEntriesByRows(doc),
      multiplierBandsByRows: doc.multiplierBandsByRows,
      slotPercentsByRows: doc.slotPercentsByRows,
      slotMultipliersByRows: doc.slotMultipliersByRows,
      updatedAt: doc.updatedAt,
    });
  } catch (e) {
    console.error("[plinko] putPlinkoRates", e);
    return res.status(500).json({ error: e.message });
  }
};

/** Authenticated: read Plinko synthetic bot tuning (Mongo singleton `PlinkoBotSettings`). */
export const getPlinkoBotSettings = async (_req, res) => {
  try {
    const data = await getPlinkoBotSettingsRaw();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

/**
 * Authenticated: merge-update `winBotRate`, `loseBotRate` (0…1), `botRunIntervalMs` (500…120000),
 * `botMultiplierBands` (`[{ min, max, probability }, …]` — bot landing by multiplier range; empty = use win/lose/natural).
 */
export const putPlinkoBotSettings = async (req, res) => {
  try {
    const { winBotRate, loseBotRate, botRunIntervalMs, botMultiplierBands } = req.body;
    const update = {};
    if (winBotRate !== undefined) {
      const w = toNum(winBotRate);
      if (!Number.isFinite(w) || w < 0 || w > 1) {
        return res.status(400).json({ error: "winBotRate must be between 0 and 1" });
      }
      update.winBotRate = w;
    }
    if (loseBotRate !== undefined) {
      const l = toNum(loseBotRate);
      if (!Number.isFinite(l) || l < 0 || l > 1) {
        return res.status(400).json({ error: "loseBotRate must be between 0 and 1" });
      }
      update.loseBotRate = l;
    }
    if (botRunIntervalMs !== undefined) {
      const ms = Math.round(toNum(botRunIntervalMs));
      if (!Number.isFinite(ms) || ms < 500 || ms > 120000) {
        return res.status(400).json({ error: "botRunIntervalMs must be between 500 and 120000" });
      }
      update.botRunIntervalMs = ms;
    }
    if (botMultiplierBands !== undefined) {
      const v = parseAndValidateBotMultiplierBands(botMultiplierBands);
      if (!v.ok) {
        return res.status(400).json({ error: v.error });
      }
      update.botMultiplierBands = v.bands;
      update.botBandsMigratedV1 = true; // prevent one-time init migration from refilling after explicit clear
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        error:
          "Provide at least one of: winBotRate, loseBotRate, botRunIntervalMs, botMultiplierBands",
      });
    }
    const doc = await PlinkoBotSettings.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true }).lean();
    invalidatePlinkoBotSettingsCache();
    return res.json({
      message: "Plinko bot settings updated; the feed uses them on the next tick.",
      winBotRate: doc.winBotRate,
      loseBotRate: doc.loseBotRate,
      botRunIntervalMs: doc.botRunIntervalMs,
      botMultiplierBands: Array.isArray(doc.botMultiplierBands) ? doc.botMultiplierBands : [],
      updatedAt: doc.updatedAt,
    });
  } catch (e) {
    console.error("[plinko] putPlinkoBotSettings", e);
    return res.status(500).json({ error: e.message });
  }
};

/** Clear stored bands, weights + multipliers — all rows fall back to built-in tables. */
export const postPlinkoRatesReset = async (_req, res) => {
  try {
    await PlinkoRateSettings.findOneAndUpdate(
      {},
      {
        $set: {
          slotEntriesByRows: {},
          multiplierBandsByRows: {},
          slotPercentsByRows: {},
          slotMultipliersByRows: {},
        },
      },
      { upsert: true, new: true }
    ).lean();
    invalidatePlinkoRatesCache();
    return res.json({ message: "Plinko rates reset to built-in defaults." });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
