import axiosInstance from "../api/axiosConfig";

const mergeTwistUser = (res, dispatch) => {
    dispatch({
        type: "MERGE_USER",
        payload: res?.data?.user || {},
    });
};

export const getTwistView = async (history) => {
    try {
        const res = await axiosInstance.get("/twist/getTwistView");
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return { data: [] };
    }
};

/**
 * @returns {Promise<{ data?: { symbol: string, multiplier: number, bet: number, win: number }, error?: string }>}
 */
export const twistBet = async (betAmount, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/twist/bet", { betAmount });
        mergeTwistUser(res, dispatch);
        console.log(res.data);
        return { data: res.data?.data };
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        const msg = err.response?.data?.error || err.message || "Bet failed";
        return { error: typeof msg === "string" ? msg : "Bet failed" };
    }
};

/**
 * @returns {Promise<{ data?: { win: number }, error?: string }>}
 */
export const twistCashOut = async (dispatch, history) => {
    try {
        const res = await axiosInstance.post("/twist/cashOut", {});
        mergeTwistUser(res, dispatch);
        return { data: res.data?.data };
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        const msg = err.response?.data?.error || err.message || "Cash out failed";
        return { error: typeof msg === "string" ? msg : "Cash out failed" };
    }
};

