import axiosInstance from "../api/axiosConfig";

const MY_HISTORY_TTL_MS = 60000;

const PAYOUT = { green: 1.96, red: 1.96, violet: 4.5, number: 9 };

let myHistoryCache = null;
let myHistoryFetchedAt = 0;
let myHistoryInFlight = null;

function round2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function prependMyFastCrashBetRow(prev, payload) {
  const betId = payload?.betId;
  if (!betId) return Array.isArray(prev) ? prev : [];
  const arr = Array.isArray(prev) ? prev : [];
  if (arr.some((r) => String(r._id) === String(betId))) return arr;
  const now = new Date();
  const entry = {
    _id: betId,
    roundId: payload.roundId,
    side: payload.side,
    digit: payload.digit,
    betAmount: round2(payload.betAmount ?? 0),
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

export function patchMyFastCrashHistoryAfterResult(prev, { roundId, winningDigit, resultColor }) {
  if (!Array.isArray(prev) || roundId == null || winningDigit == null || resultColor == null) return prev;
  const rid = String(roundId);
  const wd = Math.floor(Number(winningDigit));
  const rc = String(resultColor).toLowerCase();
  let changed = false;
  const next = prev.map((row) => {
    if (String(row?.roundId) !== rid) return row;
    const side = String(row.side || "").toLowerCase();
    const bet = Number(row.betAmount) || 0;
    let winAmount = 0;
    if (side === "number") {
      const d = Math.floor(Number(row.digit));
      if (d === wd) winAmount = round2(bet * PAYOUT.number);
    } else if (["green", "red", "violet"].includes(side) && side === rc) {
      winAmount = round2(bet * PAYOUT[side]);
    }
    if (
      Number(row.winAmount) === winAmount &&
      Math.floor(Number(row.winningDigit ?? -1)) === wd &&
      String(row.resultColor || "").toLowerCase() === rc
    ) {
      return row;
    }
    changed = true;
    return {
      ...row,
      winAmount,
      winningDigit: wd,
      resultColor: rc,
    };
  });
  if (changed) {
    myHistoryCache = next;
    myHistoryFetchedAt = Date.now();
  }
  return changed ? next : prev;
}

export async function getFastCrashState() {
  const res = await axiosInstance.get("/fast-crash/state");
  return res.data;
}

export async function placeFastCrashBet(data, dispatch) {
  const res = await axiosInstance.post("/fast-crash/bet", data);
  if (res.data?.balanceDelta != null) {
    dispatch({
      type: "UPDATE_USER_BALANCE",
      payload: res.data.balanceDelta,
    });
  }
  return res.data;
}

export async function getMyFastCrashHistory(options = {}) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && myHistoryCache && now - myHistoryFetchedAt < MY_HISTORY_TTL_MS) {
    return myHistoryCache;
  }

  if (myHistoryInFlight && !force) {
    return myHistoryInFlight;
  }

  myHistoryInFlight = axiosInstance
    .get("/fast-crash/history/me")
    .then((res) => {
      const data = Array.isArray(res.data) ? res.data : [];
      myHistoryCache = data;
      myHistoryFetchedAt = Date.now();
      return data;
    })
    .finally(() => {
      myHistoryInFlight = null;
    });

  return myHistoryInFlight;
}
