import axiosInstance from "../api/axiosConfig";

/** Places bet; returns { result, roundId, balance } or undefined on error. */
export const betWheel = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/wheel/betWheel", data);

        if (res.data.balance != null) {
            dispatch({
                type: "UPDATE_USER_BALANCE",
                payload: res.data.balance,
            });
        }

        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
    }
};

/** Call after the wheel animation finishes. Credits wins; server needs stake + level to compute payout. */
export const completeWheelSpin = async ({ multiplier, betAmount, level }, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/wheel/completeSpin", {
            multiplier,
            betAmount,
            level,
        });

        if (res.data?.message === "Wheel spin complete" && res.data?.balance != null) {
            dispatch({
                type: "UPDATE_USER_BALANCE",
                payload: res.data.balance,
            });
        }
        if (res.data?.history != null) {
            dispatch({
                type: "SET_WHEEL_HISTORY",
                payload: res.data.history,
            });
        }
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }

    }
};

export const getWheelResult = async (history) => {
    try {
        const res = await axiosInstance.get("/wheel/getResult");
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
    }
};

export const getWheelHistory = (history, dispatch) => async () => {
    try {
        const res = await axiosInstance.get("/wheel/getWheelHistory");

        if (res.data.history != null) {
            dispatch({
                type: "SET_WHEEL_HISTORY",
                payload: res.data.history,
            });
        }
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
    }
};