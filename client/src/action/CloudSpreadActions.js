import axiosInstance from "../api/axiosConfig";

export async function getCloudSpreadState() {
  const res = await axiosInstance.get("/cloud-spread/state");
  return res.data;
}

export async function placeCloudSpreadBet(data, dispatch) {
  const res = await axiosInstance.post("/cloud-spread/bet", data);
  if (dispatch && Number.isFinite(Number(res?.data?.balance))) {
    dispatch({ type: "SET_BALANCE", payload: Number(res.data.balance) });
  }
  return res.data;
}

export async function cashOutCloudSpread(dispatch) {
  const res = await axiosInstance.post("/cloud-spread/cashout");
  if (dispatch && res.data?.user) {
    // Instead of replacing the entire user object (which might be partial), 
    // only update the fields that changed to avoid flickering and redundant header updates.
    if (Number.isFinite(Number(res.data.user.balance))) {
      dispatch({ type: "SET_BALANCE", payload: Number(res.data.user.balance) });
    }
    // If we need more user data, we can call getUserData(dispatch) or merge carefully.
    // For now, balance is the most critical for the header.
  }
  return res.data;
}

export async function getMyCloudSpreadHistory() {
  const res = await axiosInstance.get("/cloud-spread/history/me");
  return res.data;
}

/** Recent cash-out + bot rows for the live feed (initial load; real-time via Ably). */
export async function getLiveCloudSpreadHistory() {
  const res = await axiosInstance.get("/cloud-spread/history/live");
  return res.data;
}
