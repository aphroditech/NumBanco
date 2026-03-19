import axiosInstance from "../api/axiosConfig";

import { NotToken, setUserRedux } from "./index";
import { setNotification } from "utils/localStorage";
import { toast } from "react-toastify"

export const profileInfo = async (data, history, dispatch) => {
    if (NotToken(history)) return;
    try {
        const res = await axiosInstance.post('/profile/profileInfo', data);
        setUserRedux(res, dispatch, history);
    } catch (err) {
        console.log(err);
        setNotification(err.response.data.message, dispatch, "error");
        toast.error(err.response.data.message);

        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const profilePassword = async (data, history, dispatch) => {
    if (NotToken(history)) return;
    try {
        const res = await axiosInstance.post('/profile/profilePassword', data);
        setUserRedux(res, dispatch, history);
    } catch (err) {
        setNotification(err.response.data.message, dispatch, "error");
        toast.error(err?.response?.data?.message);

        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const profileUserAvatar = async (data, history, dispatch) => {
    if (NotToken(history)) return;
    try {
        const res = await axiosInstance.post('/profile/profileUserAvatar', data);
        setUserRedux(res, dispatch, history);
    } catch (err) {
        setNotification(err.response.data.message, dispatch, "error");
        toast.error(err.response.data.message);

        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const setSecurity = async (dispatch) => {
    try {
        const res = await axiosInstance.get("/profile/setSecurity");
        setUserRedux(res, dispatch);
    } catch (err) {
        console.log(err);
    }
}
