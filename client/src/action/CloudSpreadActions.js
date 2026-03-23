import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from "./index";

export async function getCloudSpreadState() {
  const res = await axiosInstance.get("/cloud-spread/state");
  return res.data;
}

export async function placeCloudSpreadBet(data, dispatch) {
  const res = await axiosInstance.post("/cloud-spread/bet", data);
  setUserRedux(res, dispatch);
  return res.data;
}

export async function cashOutCloudSpread(dispatch) {
  const res = await axiosInstance.post("/cloud-spread/cashout");
  if (dispatch && res.data?.user) {
    dispatch({ type: "SET_USER", payload: res.data.user });
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
