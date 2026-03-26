import MinesSetting from "../../models/mines/MinesSetting.js";

const GRID_SIZE = 25;
const MODES = { easy: 2, normal: 4, hard: 6, ace: 8 };

/**
 * In-memory cache of multiplier tables from the database (source of truth).
 * Refreshed at startup and on each getPrefix so admin updates take effect without restart.
 */
const MULTIPLIER_CACHE = {
  easy: null,
  normal: null,
  hard: null,
  ace: null,
};

const WINRATE_CACHE = {
  minesMode2RateFactor: null,
  winRateBands: null,
};

/** Fallback only when DB has no multipliers yet (e.g. before first seed). Prefer DB always. */
const FALLBACK_EASY = [
  0.5, 0.8, 1.1, 1.15, 1.21, 1.27, 1.34, 1.42, 1.51, 1.61, 1.72, 1.86,
  2.01, 2.19, 2.41, 2.68, 3.02, 3.45, 4.02, 4.83, 6.03, 8.04, 12.06,
];
const FALLBACK_NORMAL = [
  0.6, 0.9, 1, 1.25, 1.38, 1.52, 1.69, 1.89, 2.13, 2.41, 2.76, 3.18,
  3.8, 4.35, 5.4, 6.87, 8.56, 10.86, 20.5, 43.56, 89.88,
];
const FALLBACK_HARD = [
  0.7, 0.9, 1, 1.44, 1.66, 1.87, 2.04, 2.54, 2.79, 3.01, 3.69, 3.9,
  4.24, 5.84, 10.87, 24.68, 50.65, 100.98, 210.65,
];
const FALLBACK_ACE = [
  0.7, 1, 1.44, 1.96, 2.34, 3.48, 4.92, 5.83, 8.64, 13.56, 25.68, 38.96,
  68.48, 100.96, 200.12, 420.45, 842.56,
];

function getMultiplierTable(minesCount) {
  const key = minesCount === MODES.easy ? "easy" : minesCount === MODES.normal ? "normal" : minesCount === MODES.hard ? "hard" : minesCount === MODES.ace ? "ace" : null;
  if (!key) return null;
  const fromDb = MULTIPLIER_CACHE[key];
  if (Array.isArray(fromDb) && fromDb.length > 0) return fromDb;
  return key === "easy" ? FALLBACK_EASY : key === "normal" ? FALLBACK_NORMAL : key === "hard" ? FALLBACK_HARD : key === "ace" ? FALLBACK_ACE : null;
}

/**
 * Generate unique random mine indices for a 5x5 grid.
 * @param {number} count - Number of mines (from mode)
 * @returns {number[]}
 */
export function generateMineIndices(count) {
  const indices = new Set();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * GRID_SIZE));
  }
  return Array.from(indices);
}

const HOUSE_EDGE = 0.05;

/**
 * Multiplier after revealing `revealed` safe tiles.
 * All modes use fixed multiplier tables (easy 2, normal 4, hard 6, ace 8 mines).
 * @param {number} totalTiles - 25
 * @param {number} minesCount
 * @param {number} revealed - Number of safe tiles revealed
 * @returns {number}
 */
export function getMultiplierForRevealed(totalTiles, minesCount, revealed) {
  if (revealed <= 0) return 1;

  const table = getMultiplierTable(minesCount);
  if (table) {
    const idx = revealed - 1;
    if (idx >= 0 && idx < table.length) return table[idx];
    return table[table.length - 1];
  }

  // Fallback (formula) if unknown minesCount
  const safe = totalTiles - minesCount;
  let probability = 1;
  let remainingSafe = safe;
  let remainingTiles = totalTiles;
  for (let i = 0; i < revealed; i++) {
    probability *= remainingSafe / remainingTiles;
    remainingSafe--;
    remainingTiles--;
  }
  const multiplier = 1 / probability;
  const withHouseEdge = multiplier * (1 - HOUSE_EDGE);
  return Number(withHouseEdge.toFixed(2));
}

/**
 * Load multiplier tables from database into in-memory cache.
 * Call at startup and on getPrefix so DB is always the source of truth and admin updates apply without restart.
 */
export async function refreshMinesMultiplierCache() {
  try {
    const doc = await MinesSetting
      .findOne({})
      .select("easyMultipliers normalMultipliers hardMultipliers aceMultipliers minesMode2RateFactor winRateBands")
      .lean();
    if (doc) {
      if (Array.isArray(doc.easyMultipliers) && doc.easyMultipliers.length > 0) MULTIPLIER_CACHE.easy = doc.easyMultipliers;
      else MULTIPLIER_CACHE.easy = null;
      if (Array.isArray(doc.normalMultipliers) && doc.normalMultipliers.length > 0) MULTIPLIER_CACHE.normal = doc.normalMultipliers;
      else MULTIPLIER_CACHE.normal = null;
      if (Array.isArray(doc.hardMultipliers) && doc.hardMultipliers.length > 0) MULTIPLIER_CACHE.hard = doc.hardMultipliers;
      else MULTIPLIER_CACHE.hard = null;
      if (Array.isArray(doc.aceMultipliers) && doc.aceMultipliers.length > 0) MULTIPLIER_CACHE.ace = doc.aceMultipliers;
      else MULTIPLIER_CACHE.ace = null;

      WINRATE_CACHE.minesMode2RateFactor = doc.minesMode2RateFactor ?? null;
      WINRATE_CACHE.winRateBands = Array.isArray(doc.winRateBands) && doc.winRateBands.length > 0 ? doc.winRateBands : null;
    }
  } catch (err) {
    console.warn("Mines multiplier cache refresh failed:", err?.message);
  }
}

export function getMinesWinRateCache() {
  return WINRATE_CACHE;
}

export function getMinesCountForMode(mode) {
  return MODES[mode] ?? MODES.normal;
}

/**
 * Win rate (0–1) for revealing a safe tile based on current multiplier.
 * @param {number} multiplier - Current multiplier (e.g. from getMultiplierForRevealed).
 * @param {Array<{ min: number, max: number, rate: number }>} [bands] - From DB (MinesSetting.winRateBands). If provided, use these; else use fallback.
 * When user.minesMode is 2, caller multiplies by minesMode2RateFactor for multiplier > 1.
 */
export function getWinRateForMultiplier(multiplier, bands) {
  const m = Number(multiplier);
  if (Array.isArray(bands) && bands.length > 0) {
    const band = bands.find((b) => m > b.min && m <= b.max);
    if (band != null) return Number(band.rate);
    if (m <= 0) return bands[0]?.rate ?? 0.9;
    return bands[bands.length - 1]?.rate ?? 0;
  }
  if (m <= 0) return 0.9;
  if (m <= 1) return 0.9;
  if (m <= 2) return 0.6;
  if (m <= 3) return 0.4;
  if (m <= 4) return 0.2;
  if (m <= 5) return 0.1;
  if (m <= 10) return 0.05;
  return 0;
}

export { GRID_SIZE, MODES };
