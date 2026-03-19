import axiosInstance from "../api/axiosConfig";

import { NotToken, setUserRedux } from "./index";
import { toast } from "react-toastify"

export const handleRubicBet = async (data, history, dispatch) => {

    try {

        const res = await axiosInstance.post("/rubic/handleRubicBet", data);
        if (res.data.isWin) {
            setUserRedux(res, dispatch);
            return { isWin: true, winAmount: res.data.winAmount };
        } else {
            dispatch({
                type: "SET_USER",
                payload: res.data.user
            });
            toast.error(res.data.message);
            return { isWin: false, winAmount: 0 };
        }

    } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || err.message || "Bet failed";
        toast.error(errorMessage);

        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const removeUserBalance = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/rubic/removeUserBalance", data);
        setUserRedux(res, dispatch);
        return res.data.M1uXj3sZ || 0;
    } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || err.message || "Remove balance failed";
        toast.error(errorMessage);

        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }

        return 0;
    }
};

export const getUserRubicHistory = async (history) => {
    try {
        const res = await axiosInstance.get("/rubic/getUserRubicHistory");
        return res.data;
    } catch (err) {
        console.error(err);

        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }

        return [];
    }
};