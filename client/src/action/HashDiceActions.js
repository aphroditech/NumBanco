import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify";

/**
 * @param {{ amount: number, payout: number, side: 0 | 1 }} data
 * @param {{ skipUserMerge?: boolean }} [opts] — defer MERGE_USER until after roll animation
 */
export const hashDiceBet = async (data, dispatch, history, opts = {}) => {
    const { skipUserMerge = false } = opts;
    try {
        const res = await axiosInstance.post("/hash-dice/bet", data);
        if (dispatch && !skipUserMerge && res?.data?.data?.balance != null) {
            dispatch({
                type: "MERGE_USER",
                payload: { balance: res.data.data.balance },
            });
        }
        return res.data;
    } catch (err) {
        const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Hash Dice bet failed";
        toast.error(msg);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
};

/** Public: latest `HashDiceResult` rows (you + bots) for the live column. */
export const fetchHashDiceLiveResults = async () => {
    try {
        const res = await axiosInstance.get("/hash-dice/results");
        return res.data?.data || [];
    } catch {
        return [];
    }
};

export const fetchHashDiceHistory = async (history) => {
    try {
        const res = await axiosInstance.get("/hash-dice/history/me", {
            params: { limit: 500 },
        });
        return res.data?.history || [];
    } catch (err) {
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};
