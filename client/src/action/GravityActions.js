import axiosInstance from "../api/axiosConfig";

const MY_GRAVITY_HISTORY_TTL_MS = 5000;
let myHistoryCache = null;
let myHistoryFetchedAt = 0;
let myHistoryInFlight = null;

export async function getGravityState() {
  const res = await axiosInstance.get("/gravity/state");
  return res.data;
}

export async function placeGravityBet(data, dispatch) {
  const res = await axiosInstance.post("/gravity/bet", data);
  if (res.data?.balanceDelta != null) {
    dispatch({
      type: "UPDATE_USER_BALANCE",
      payload: res.data.balanceDelta,
    });
  }
  return res.data;
}

export async function getMyGravityHistory(options = {}) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && myHistoryCache && now - myHistoryFetchedAt < MY_GRAVITY_HISTORY_TTL_MS) {
    return myHistoryCache;
  }

  if (myHistoryInFlight) {
    return myHistoryInFlight;
  }

  myHistoryInFlight = axiosInstance
    .get("/gravity/history/me")
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

export async function getLiveGravityHistory() {
  const res = await axiosInstance.get("/gravity/history/live");
  return res.data;
}
