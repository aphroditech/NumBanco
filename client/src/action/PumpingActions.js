import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";

export const pumpingBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/pumping/bet', data);
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

export const getPumpingView = async (history) => {
    try {
        const res = await axiosInstance.get('/pumping/getPumpingView');
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};