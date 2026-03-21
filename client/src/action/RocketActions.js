import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify"

export const rocketBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/rocket/bet', data); // data contains bet, level
        if(res.data.balance != null) {
            dispatch({
                type: 'SET_BALANCE',
                payload: res.data.balance
            });
        }
        return res.data.multiplier || 0;
    } catch (error) {
        console.error(error);
        if(error.response.message) toast.error(err.response.message);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return 0;
    }
};

export const rocketShotResult = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/rocket/shotResult', data); // data contains isWin, betAmount, level. The goal is to save the result to the database
        if(res.data.balance != null) {
            dispatch({
                type: 'SET_BALANCE',
                payload: res.data.balance
            });
        }   
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
    }
};

export const getRocketResults = (history) => async () => {
    try {
        const res = await axiosInstance.get('/rocket/getRocketResults');
        return res.data;
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return [];
    }
};