import axiosInstance from "../api/axiosConfig";

import { setUserRedux } from "action";
import { setNotification } from "utils/localStorage";
import { toast } from "react-toastify"

export const GET_BET_HISTORY_REQUEST = "GET_BET_HISTORY_REQUEST";
export const GET_BET_HISTORY_SUCCESS = "GET_BET_HISTORY_SUCCESS";
export const GET_BET_HISTORY_FAIL = "GET_BET_HISTORY_FAIL";

export const GET_MY_HISTORY_REQUEST = "GET_MY_HISTORY_REQUEST";
export const GET_MY_HISTORY_SUCCESS = "GET_MY_HISTORY_SUCCESS";
export const GET_MY_HISTORY_FAIL = "GET_MY_HISTORY_FAIL";

export const BET_WINS_REQUEST = "BET_WINS_REQUEST";
export const BET_WINS_SUCCESS = "BET_WINS_SUCCESS";
export const BET_WINS_FAIL = "BET_WINS_FAIL";

export const CURRENT_BET_REQUEST = "CURRENT_BET_REQUEST";
export const CURRENT_BET_SUCCESS = "CURRENT_BET_SUCCESS";
export const CURRENT_BET_FAIL = "CURRENT_BET_FAIL";

export const GET_MY_BETIDS_REQUEST = "GET_MY_BETIDS_REQUEST";
export const GET_MY_BETIDS_SUCCESS = "GET_MY_BETIDS_SUCCESS";
export const GET_MY_BETIDS_FAIL = "GET_MY_BETIDS_FAIL";

const tiers = ["tierA", "tierB", "tierC"];


export const buyTickets = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/bet/buyTickets", data);
        setNotification("Successfully purchased " + data.tickets?.length + " ticket(s) in " + data.betId + " of " + tiers[data.level], dispatch, "success");
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || "Failed to purchase tickets";
        setNotification(errorMessage, dispatch, "error");
        toast.error(errorMessage);
        if (err.status === 401) {
            history.push("/auth/landing");
        }
    }
};

export const getSoldTickets = async (data, history) => {
    try {
        const res = await axiosInstance.post("/bet/soldTickets", data);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.status === 401) {
            history.push("/auth/landing");
        }

        return { soldTickets: [], sellTicketCnt: 0 };
    }
};


export const getBetId = async (data, history) => {
    try {
        const res = await axiosInstance.get("/bet/getBetId", {
            params: { data }
        });
        return res.data
    } catch (err) {
        console.error(err);
        if (err.status === 401) {
            history.push("/auth/landing");
        }
        return null;
    }
}

export const getMyBetIds = ({ betId, level }) => async (dispatch) => {
    try {
        dispatch({ type: GET_MY_BETIDS_REQUEST });

        const { data } = await axiosInstance.post(
            "/bet/getMyBetIds",
            { betId, level }
        );
        dispatch({
            type: GET_MY_BETIDS_SUCCESS,
            payload: data, // 👈 array of numbers
        });
    } catch (error) {
        dispatch({
            type: GET_MY_BETIDS_FAIL,
            payload:
                error.response?.data?.message || error.message,
        });
    }
};

export const getMyHistory = ({ betId, level, type }) => async (dispatch) => {
    try {
        dispatch({ type: GET_MY_HISTORY_REQUEST });
        const { data } = await axiosInstance.post("/bet/getMyHistory", {
            betId,
            level,
            type,
        });

        dispatch({
            type: GET_MY_HISTORY_SUCCESS,
            payload: data, // ✅ send data to reducer
        });
    } catch (error) {
        dispatch({
            type: GET_MY_HISTORY_FAIL,
            payload:
                error.response?.data?.message || error.message,
        });
    }
};

export const getBetHistory = ({ betId, level, type }) => async (dispatch) => {
    try {
        dispatch({ type: GET_BET_HISTORY_REQUEST });

        const { data } = await axiosInstance.post("/bet/getBetHistory", {
            betId,
            level,
            type,
        });


        dispatch({
            type: GET_BET_HISTORY_SUCCESS,
            payload: data, // ✅ send data to reducer
        });
    } catch (error) {
        dispatch({
            type: GET_BET_HISTORY_FAIL,
            payload:
                error.response?.data?.message || error.message,
        });
        return;
    }
};

export const getBetWins = ({ betId, level, type, history }) => async (dispatch) => {
    try {
        dispatch({ type: BET_WINS_REQUEST });

        const { data } = await axiosInstance.post("/bet/getBetHistory", {
            betId,
            level,
            type,
        });

        dispatch({
            type: BET_WINS_SUCCESS,
            payload: data, // ✅ send data to reducer
        });
    } catch (error) {
        dispatch({
            type: BET_WINS_FAIL,
            payload:
                error.response?.data?.message || error.message,
        });

        if (error.status === 401) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const getCurrentBetData = async (data) => {
    try {
        const res = await axiosInstance.post("/bet/getcurrentdata", data)
        return res.data;
    } catch (err) {
        console.error(err);
    }
}


export const onlineUser = async (level) => {
    try {
        await axiosInstance.get("/bet/onlineUser", {
            params: { level }
        });
    } catch (err) {
        console.error(err);
    }
};

export const offlineUser = async (level = null) => {
    try {
        await axiosInstance.get("/bet/offlineUser", {
            params: { level }
        });
    } catch (err) {
        console.error(err);
    }
}

export const totalActiveUsers = async () => {
    try {
        const res = await axiosInstance.get("/bet/activeusers");
        return res.data;
    } catch (err) {
        console.error(err);
    }
}