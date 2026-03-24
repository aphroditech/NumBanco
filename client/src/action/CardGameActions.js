import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";

export const cardGameBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/cardGame/bet', data);
        setUserRedux(res, dispatch);
        return res.data.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};


export const getCardGameView = async (history) => {
    try {
        const res = await axiosInstance.get('/cardGame/getCardGameView');
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};