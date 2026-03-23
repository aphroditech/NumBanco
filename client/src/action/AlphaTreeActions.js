
import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";

/** POST /api/alpha-tree/start { betAmount } */
export const alphaTreeStart = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/alpha-tree/start", data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        throw err;
    }
};

/** POST /api/alpha-tree/pick { letter: 'A'|'B'|'C'|'D' } */
export const alphaTreePick = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/alpha-tree/pick", data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        throw err;
    }
};

/** POST /api/alpha-tree/cashout */
export const alphaTreeCashOut = async (dispatch, history) => {
    try {
        const res = await axiosInstance.post("/alpha-tree/cashout");
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        throw err;
    }
};

/** GET /api/alpha-tree/state */
export const getAlphaTreeState = async (history) => {
    try {
        const res = await axiosInstance.get("/alpha-tree/state");
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return { alphaTree: null };
    }
};

export const getAlphaTreeView = async (history) => {
    try {
        const res = await axiosInstance.get("/alpha-tree/getAlphaTreeView");
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
    }
};
