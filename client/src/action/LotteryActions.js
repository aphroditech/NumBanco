import axiosInstance from "../api/axiosConfig";

import { NotToken, setUserRedux } from "./index";
import { setNotification } from "utils/localStorage";
import { toast } from "react-toastify"

export const getClickData = async (data, dispatch, flag, history = null) => {
    try {
        const res = await axiosInstance.post("/lottery/dailyloot", { data: data, flag: flag });
        if (flag) {
            return res.data;
        }
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
}

export const betReward = async (data, history, dispatch) => {
    if (NotToken(history)) return;
    try {
        const res = await axiosInstance.post('/lottery/reward', data);
        setUserRedux(res, dispatch);
    } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || 'Error getting reward';
        setNotification(errorMessage, dispatch, "error");
        toast.error(err.response.data);
        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};