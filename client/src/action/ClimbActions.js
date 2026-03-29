import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";

export const climbStart = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/climb/start", data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");
        throw err;
    }
};

export const climbPick = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/climb/pick", data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");
        throw err;
    }
};

export const climbCashOut = async (dispatch, history) => {
    try {
        const res = await axiosInstance.post("/climb/cashout");
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");
        throw err;
    }
};

export const getClimbView = async (history) => {
    try {
        const res = await axiosInstance.get("/climb/getClimbView");
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return { data: [] };
    }
};

export const getClimbState = async (history) => {
    try {
        const res = await axiosInstance.get("/climb/state");
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");
        return { climb: null };
    }
};

