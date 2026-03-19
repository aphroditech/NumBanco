import axiosInstance from "../api/axiosConfig";

import { setUserRedux } from "./index";
import { setNotification } from "utils/localStorage";
import { toast } from "react-toastify"

export const deposit = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/deposit', data);
        setUserRedux(res, dispatch);
        return res;
    } catch (error) {
        console.error(error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create deposit.';
        toast.error(errorMessage);
        setNotification(errorMessage, dispatch, "error");
        if (error.response?.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const depositFail = async (dispatch, history) => {
    try {
        const res = await axiosInstance.get('/deposit/fail');
        toast.error('Deposit status updated to failed')
        setUserRedux(res, dispatch);
    }
    catch (error) {
        console.error(error);
        toast.error('Failed to update deposit status.');
        setNotification(error.response.data.message, dispatch, "error");
        if (error.response?.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};