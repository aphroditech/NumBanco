import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";

export const getTarotLiveView = async (history) => {
    try {
        const res = await axiosInstance.get("/tarot/live-view");
        return res;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");
        throw err;
    }
};

/** POST body: `{ betAmount }`. Returns `{ tarot, user, ... }`. */
export const tarotPlay = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/tarot/play", data);
        setUserRedux(res, dispatch, null, false);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");
        throw err;
    }
};
