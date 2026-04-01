import axiosInstance from "../api/axiosConfig";

export const rangeBet = async (data, history, dispatch) => {
    try {
        const res = await axiosInstance.post("/range/bet", data);
        if (res.data.balance != null) {
            dispatch({
                type: "UPDATE_USER_BALANCE",
                payload: res.data.balance,
            });
        }
        if (res.data.history != null) {
            dispatch({
                type: "SET_RANGE_HISTORY",
                payload: res.data.history,
            });
        }
        return { result: res.data.result, isWin: res.data.isWin };
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
};

export const getRangeHistory = async (history, dispatch) => {
    try {
        const res = await axiosInstance.get('/range/history');
        if (res.data.history != null) {
            dispatch({
                type: 'SET_RANGE_HISTORY',
                payload: res.data.history || [],
            });
        }
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return [];
    }
}

export const getRangeResults = async (history) => {
    try {
        const res = await axiosInstance.get('/range/results');
        if (res.data.results != null) {
            return res.data.results;
        }
        return [];
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return [];
    }
}