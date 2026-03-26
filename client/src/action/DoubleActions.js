import axiosInstance from "../api/axiosConfig";

/** How long to reuse in-memory history without hitting the server (avoids log spam / 304 storms). */
const MY_DOUBLE_HISTORY_TTL_MS = 60000;
/** Must match server `doubleGame.service` payout multipliers. */
const DOUBLE_MULT_RB = 2;
const DOUBLE_MULT_GREEN = 14;

let myHistoryCache = null;
let myHistoryFetchedAt = 0;
let myHistoryInFlight = null;

function doubleRound2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * After a successful POST /double/bet, prepend the row so bet history updates without refetch.
 * Keeps module cache aligned with React state.
 */
export function prependMyDoubleBetRow(prev, payload) {
  const betId = payload?.betId;
  if (!betId) return Array.isArray(prev) ? prev : [];
  const arr = Array.isArray(prev) ? prev : [];
  if (arr.some((r) => String(r._id) === String(betId))) return arr;
  const now = new Date();
  const entry = {
    _id: betId,
    roundId: payload.roundId,
    side: payload.side,
    betAmount: doubleRound2(payload.betAmount ?? 0),
    winAmount: 0,
    userName: payload.row?.userName ?? payload.user?.altas ?? "",
    avatar: payload.row?.avatar ?? payload.user?.avatar ?? "",
    createAt: now,
    createdAt: now,
  };
  const next = [entry, ...arr];
  myHistoryCache = next;
  myHistoryFetchedAt = Date.now();
  return next;
}

/**
 * Apply DOUBLE_RESULT outcome to local rows (same math as server settle). Avoids GET /double/history/me every round.
 */
export function patchMyDoubleHistoryAfterDoubleResult(prev, { roundId, winningColor, winningSlot }) {
  if (!Array.isArray(prev) || roundId == null || winningColor == null || winningSlot == null) {
    return prev;
  }
  const rid = String(roundId);
  const wc = String(winningColor).toLowerCase();
  const ws = Number(winningSlot);
  const mult = wc === "green" ? DOUBLE_MULT_GREEN : DOUBLE_MULT_RB;
  let changed = false;
  const next = prev.map((row) => {
    if (String(row?.roundId) !== rid) return row;
    const side = String(row.side || "").toLowerCase();
    const bet = Number(row.betAmount) || 0;
    const winAmount = side === wc ? doubleRound2(bet * mult) : 0;
    if (
      String(row.winningColor || "").toLowerCase() === wc &&
      Number(row.winningSlot) === ws &&
      Number(row.winAmount) === winAmount
    ) {
      return row;
    }
    changed = true;
    return { ...row, winningColor: wc, winningSlot: ws, winAmount };
  });
  if (changed) {
    myHistoryCache = next;
    myHistoryFetchedAt = Date.now();
  }
  return changed ? next : prev;
}

export async function getDoubleState() {
  const res = await axiosInstance.get("/double/state");
  return res.data;
}

export async function placeDoubleBet(data, dispatch) {
  const res = await axiosInstance.post("/double/bet", data);
  if (res.data?.balanceDelta != null) {
    dispatch({
      type: "UPDATE_USER_BALANCE",
      payload: res.data.balanceDelta,
    });
  }
  return res.data;
}

export async function getMyDoubleHistory(options = {}) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && myHistoryCache && now - myHistoryFetchedAt < MY_DOUBLE_HISTORY_TTL_MS) {
    return myHistoryCache;
  }

  if (myHistoryInFlight) {
    return myHistoryInFlight;
  }

  myHistoryInFlight = axiosInstance
    .get("/double/history/me")
    .then((res) => {
      myHistoryCache = res.data;
      myHistoryFetchedAt = Date.now();
      return res.data;
    })
    .finally(() => {
      myHistoryInFlight = null;
    });

  return myHistoryInFlight;
}

export async function getLiveDoubleHistory() {
  const res = await axiosInstance.get("/double/history/live");
  return res.data;
}
