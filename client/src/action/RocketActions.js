import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify"

export const rocketBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/rocket/bet', data); // data contains bet, level
        if(res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance
            });
        }
        return res.data.multiplier;
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
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance
            });
        }   
        if(res.data.rocketHistory != null) {
            dispatch({
                type: 'SET_ROCKET_HISTORY',
                payload: res.data.rocketHistory
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

export const getRocketHistory = (history, dispatch) => async () => {
    try {
        const res = await axiosInstance.get('/rocket/getRocketHistory');
        if(res.data.rocketHistory != null) {
            dispatch({
                type: 'SET_ROCKET_HISTORY',
                payload: res.data.rocketHistory
            });
        }
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
    }
};