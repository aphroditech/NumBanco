import axiosInstance from "../api/axiosConfig";

import { NotToken, setUserRedux } from "./index";
import { setNotification } from "utils/localStorage";
import { toast } from "react-toastify"

export const withdraw = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/withdraw', data);
        setUserRedux(res, dispatch);
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to process withdrawal.';
        setNotification(errorMessage, dispatch, "error");

        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }

        throw error;
    }
};

export const getprice = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/withdraw/getprice', data);
        return res.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || 'Failed to get price.';
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        setNotification(errorMessage, dispatch, 'error');
        toast.error(errorMessage);
    }
}

