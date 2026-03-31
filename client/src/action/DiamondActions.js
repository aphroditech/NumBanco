import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";

/** Public paytable: `{ tiers: [{ index, rate, chance }] }` — chances normalized server-side. */
export const getDiamondSettings = async () => {
    try {
        const res = await axiosInstance.get("/diamond/settings");
        return res.data;
    } catch (err) {
        console.error(err);

    }
};

export const getDiamondLiveView = async (history) => {
    try {
        const res = await axiosInstance.get("/diamond/live-view");
        return res;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");

    }
};

export const diamondPlay = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/diamond/play", data);
        setUserRedux(res, dispatch, null, false);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) history.push("/auth/landing");

    }
};
