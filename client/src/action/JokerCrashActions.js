import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify";

const mergeJokerCrashUser = (res, dispatch) => {
    dispatch({
        type: "MERGE_USER",
        payload: res?.data?.user || {},
    });
};

export const jokerCrashBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/jokerCrash/bet', data);
        mergeJokerCrashUser(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        if (err.response?.status === 409) {
            toast.error(err.response.data.message);
            return { error: 409 };
        }
        return;
    }
};

export const jokerCrashOperator = async (operator, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/jokerCrash/operator', operator);
        mergeJokerCrashUser(res, dispatch);
        return res.data.data;
    } catch (err) {
        toast.error(err.error);
        console.error(err.error);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const jokerCrashCashOut = async (dispatch, history) => {
    try {
        const res = await axiosInstance.get('/jokerCrash/jokerCrashCashOut');
        mergeJokerCrashUser(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const getJokerCrashView = async (history) => {
    try {
        const res = await axiosInstance.get('/jokerCrash/getJokerCrashView');
        console.log(res.data);
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};