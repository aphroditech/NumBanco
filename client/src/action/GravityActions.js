import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from "./index";

export async function getGravityState() {
  const res = await axiosInstance.get("/gravity/state");
  return res.data;
}

export async function placeGravityBet(data, dispatch) {
  const res = await axiosInstance.post("/gravity/bet", data);
  setUserRedux(res, dispatch);
  return res.data;
}

export async function getMyGravityHistory() {
  const res = await axiosInstance.get("/gravity/history/me");
  return res.data;
}

export async function getLiveGravityHistory() {
  const res = await axiosInstance.get("/gravity/history/live");
  return res.data;
}
