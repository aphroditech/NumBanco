import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";
import { toast } from "react-toastify";

export const fishingBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/fishing/bet', data);
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

export const fishingPullStay = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/fishing/pullStay', data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        toast.error(err.error);
        console.error(err.error);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const fishingCashOut = async (dispatch, history) => {
    try {
        const res = await axiosInstance.get('/fishing/fishingCashOut');
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};

export const getFishingView = async (history) => {
    try {
        const res = await axiosInstance.get('/fishing/getFishingView');
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