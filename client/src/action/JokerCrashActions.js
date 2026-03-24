import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";
import { toast } from "react-toastify";

export const jokerCrashBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/jokerCrash/bet', data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const jokerCrashOperator = async (operator, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/jokerCrash/operator', operator);
        setUserRedux(res, dispatch);
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
        setUserRedux(res, dispatch);
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