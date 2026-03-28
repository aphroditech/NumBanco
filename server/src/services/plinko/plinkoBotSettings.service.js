import PlinkoBotSettings from "../../models/plinko/PlinkoBotSettings.js";

const DEFAULT = {
  winBotRate: 0.35,
  loseBotRate: 0.35,
  botRunIntervalMs: 3000,
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Validate Mines-style `[{ min, max, probability }, …]` for bot landing. Empty array = disabled.
 */
export function parseAndValidateBotMultiplierBands(input) {
  if (input === undefined || input === null) {
    return { ok: true, bands: undefined };
  }
  if (!Array.isArray(input)) {
    return { ok: false, error: "botMultiplierBands must be an array" };
  }
  if (input.length === 0) {
    return { ok: true, bands: [] };
  }
  const out = [];
  let sum = 0;
  for (const b of input) {
    const min = toNum(b.min);
    const max = toNum(b.max);
    const p = Math.max(0, toNum(b.probability));
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { ok: false, error: "botMultiplierBands: each entry needs numeric min and max" };
    }
    out.push({ min, max, probability: p });
    sum += p;
  }
  if (sum <= 0) {
    return { ok: false, error: "botMultiplierBands: sum of probability must be > 0" };
  }
  return { ok: true, bands: out };
}

const MIN_INTERVAL_MS = 500;
const MAX_INTERVAL_MS = 120000;

let cache = { doc: null, expires: 0 };
const TTL_MS = 1500;

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function invalidatePlinkoBotSettingsCache() {
  cache.doc = null;
  cache.expires = 0;
}

async function loadDoc() {
  const now = Date.now();
  if (cache.doc && now < cache.expires) return cache.doc;
  cache.doc = await PlinkoBotSettings.findOne().lean();
  cache.expires = now + TTL_MS;
  return cache.doc;
}

/**
 * Normalized rates (sum win+lose ≤ 1) and clamped interval for the bot loop.
 */
export async function getPlinkoBotSettingsResolved() {
  const doc = await loadDoc();
  let w = clamp01(doc?.winBotRate ?? DEFAULT.winBotRate);
  let l = clamp01(doc?.loseBotRate ?? DEFAULT.loseBotRate);
  if (w + l > 1) {
    const t = w + l;
    w /= t;
    l /= t;
  }
  let ms = Math.round(Number(doc?.botRunIntervalMs) || DEFAULT.botRunIntervalMs);
  if (!Number.isFinite(ms)) ms = DEFAULT.botRunIntervalMs;
  ms = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, ms));
  const parsed = parseAndValidateBotMultiplierBands(doc?.botMultiplierBands);
  let botMultiplierBands = null;
  if (parsed.ok && Array.isArray(parsed.bands) && parsed.bands.length > 0) {
    botMultiplierBands = parsed.bands;
  }

  return {
    winRate: w,
    loseRate: l,
    naturalRate: Math.max(0, 1 - w - l),
    botRunIntervalMs: ms,
    botMultiplierBands,
  };
}

export async function getPlinkoBotSettingsRaw() {
  const doc = await loadDoc();
  const rawBands = doc?.botMultiplierBands;
  return {
    winBotRate: doc?.winBotRate ?? DEFAULT.winBotRate,
    loseBotRate: doc?.loseBotRate ?? DEFAULT.loseBotRate,
    botRunIntervalMs: doc?.botRunIntervalMs ?? DEFAULT.botRunIntervalMs,
    botMultiplierBands:
      Array.isArray(rawBands) && rawBands.length > 0 ? rawBands : [],
    updatedAt: doc?.updatedAt ?? null,
  };
}
