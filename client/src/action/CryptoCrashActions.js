import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify";

const mergeCryptoCrashUser = (res, dispatch) => {
    setTimeout(() => {
        dispatch({
            type: "MERGE_USER",
            payload: res?.data?.user || {},
        });
    }, 2000);
};

export const cryptoCrashBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/cryptoCrash/bet', data);

        console.log(res.data);
        mergeCryptoCrashUser(res, dispatch);
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

export const flipCoin = async (coin, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/cryptoCrash/flipCoin', {coin});
        mergeCryptoCrashUser(res, dispatch);
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

export const cryptoCrashCashOut = async (dispatch, history) => {
    try {
        const res = await axiosInstance.get('/cryptoCrash/cryptoCrashCashOut');
        mergeCryptoCrashUser(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const getCryptoCrashView = async (history) => {
    try {
        const res = await axiosInstance.get('/cryptoCrash/getCryptoCrashView');
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