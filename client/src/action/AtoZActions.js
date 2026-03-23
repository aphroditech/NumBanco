import axios from "axios";
import { toast } from "react-toastify";
import axiosInstance from "../api/axiosConfig";

const ATOZ_BET_TIMEOUT_MS = 20000;

function isAbortError(error) {
    return (
        axios.isCancel?.(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError"
    );
}

export const aToZBet = async (data, dispatch, history) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ATOZ_BET_TIMEOUT_MS);
    try {
        const res = await axiosInstance.post("/aToZ/bet", data, { signal: controller.signal });
        if (res.data?.balance != null) {
            dispatch({
                type: "SET_BALANCE",
                payload: res.data.balance,
            });
        }
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
            return null;
        }
        if (isAbortError(error) || error?.code === "ECONNABORTED") {
            toast.error(
                "Bet timed out — is the API running? Check server logs, MONGO_URI, and REACT_APP_API_URL."
            );
        } else if (!error.response) {
            toast.error(
                "Cannot reach API (network). Start the server on port 5000 or set REACT_APP_API_URL in client/.env"
            );
        } else {
            const msg = error.response?.data?.message;
            toast.error(typeof msg === "string" ? msg : "Bet could not be placed.");
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const aToZSpinComplete = async (result, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/aToZ/spinComplete', result);
        if(res.data.balance != null) {
            dispatch({
                type: 'SET_BALANCE',
                payload: res.data.balance
            });
        }
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}

export const getAToZResults = async (history) => {
    try {
        const res = await axiosInstance.get('/aToZ/getAToZResults');
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}