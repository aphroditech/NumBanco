import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify";

/**
 * @param {{ skipUserMerge?: boolean }} [opts] — If true, caller applies `MERGE_USER` later (e.g. after ball lands) for smoother animation.
 */
export const plinkoBet = async (data, dispatch, history, opts = {}) => {
    const { skipUserMerge = false } = opts;
    try {
        const res = await axiosInstance.post("/plinko/bet", data);
        if (dispatch && res?.data?.user && !skipUserMerge) {
            dispatch({
                type: "MERGE_USER",
                payload: res.data.user,
            });
        }
        return res.data;
    } catch (err) {
        const msg =
            err.response?.data?.error ||
            err.response?.data?.message ||
            "Plinko bet failed";
        toast.error(msg);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
};

export const fetchPlinkoHistory = async (history) => {
    try {
        const res = await axiosInstance.get("/plinko/history/me");
        return res.data?.history || [];
    } catch (err) {
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};

export const fetchPlinkoLiveResults = async () => {
    try {
        const res = await axiosInstance.get("/plinko/results");
        return res.data?.data || [];
    } catch {
        return [];
    }
};

/** Public: slot multipliers + landing % and mid-band summary (reflects DB rates when configured). */
export const fetchPlinkoRates = async (rows) => {
    try {
        const res = await axiosInstance.get("/plinko/rates", {
            params: { rows },
        });
        return res.data;
    } catch {
        return null;
    }
};

/** Authenticated: load weights + multipliers for admin editing. */
export const fetchPlinkoRatesConfig = async (history) => {
    try {
        const res = await axiosInstance.get("/plinko/rates/config");
        return res.data;
    } catch (err) {
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
};

/**
 * Authenticated: merge-update any of `slotEntriesByRows` (`[{ multiplier, rate }, …]` per row),
 * `multiplierBandsByRows`, `slotPercentsByRows`, `slotMultipliersByRows` (keys "8"…"16"). At least one section required.
 */
export const updatePlinkoRates = async (body, history) => {
    try {
        const res = await axiosInstance.put("/plinko/rates", body);
        toast.success(res.data?.message || "Rates updated");
        return res.data;
    } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || "Failed to update rates";
        toast.error(msg);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
};
