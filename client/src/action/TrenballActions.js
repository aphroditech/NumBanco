import axiosInstance from "../api/axiosConfig";

const MY_TRENBALL_HISTORY_TTL_MS = 60000;

const PAYOUT = { crash: 49.99, red: 1.96, green: 2, moon: 10 };

let myHistoryCache = null;
let myHistoryFetchedAt = 0;
let myHistoryInFlight = null;

function round2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function prependMyTrenballBetRow(prev, payload) {
  const betId = payload?.betId;
  if (!betId) return Array.isArray(prev) ? prev : [];
  const arr = Array.isArray(prev) ? prev : [];
  if (arr.some((r) => String(r._id) === String(betId))) return arr;
  const now = new Date();
  const entry = {
    _id: betId,
    roundId: payload.roundId,
    side: payload.side,
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

export function patchMyTrenballHistoryAfterResult(prev, { roundId, outcome, crashMultiplier }) {
  if (!Array.isArray(prev) || roundId == null || outcome == null) return prev;
  const rid = String(roundId);
  const oc = String(outcome).toLowerCase();
  const multPay = PAYOUT[oc];
  if (multPay == null) return prev;
  const mult =
    crashMultiplier != null && Number.isFinite(Number(crashMultiplier))
      ? round2(Number(crashMultiplier))
      : undefined;
  let changed = false;
  const next = prev.map((row) => {
    if (String(row?.roundId) !== rid) return row;
    const side = String(row.side || "").toLowerCase();
    const bet = Number(row.betAmount) || 0;
    const winAmount = side === oc ? round2(bet * multPay) : 0;
    if (
      String(row.outcome || "").toLowerCase() === oc &&
      Number(row.winAmount) === winAmount &&
      (mult == null || round2(Number(row.crashMultiplier || 0)) === mult)
    ) {
      return row;
    }
    changed = true;
    return { ...row, outcome: oc, winAmount, ...(mult != null ? { crashMultiplier: mult } : {}) };
  });
  if (changed) {
    myHistoryCache = next;
    myHistoryFetchedAt = Date.now();
  }
  return changed ? next : prev;
}

export async function getTrenballState() {
  const res = await axiosInstance.get("/trenball/state");
  return res.data;
}

export async function placeTrenballBet(data, dispatch) {
  const res = await axiosInstance.post("/trenball/bet", data);
  if (res.data?.balanceDelta != null) {
    dispatch({
      type: "UPDATE_USER_BALANCE",
      payload: res.data.balanceDelta,
    });
  }
  return res.data;
}

export async function getMyTrenballHistory(options = {}) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && myHistoryCache && now - myHistoryFetchedAt < MY_TRENBALL_HISTORY_TTL_MS) {
    return myHistoryCache;
  }

  if (myHistoryInFlight && !force) {
    return myHistoryInFlight;
  }

  myHistoryInFlight = axiosInstance
    .get("/trenball/history/me")
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
