import axiosInstance from "../api/axiosConfig";

export const checkCanWin = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/mining/checkCanWin', data);
        if (res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance
            });
        }
        return res.data.M1uXj3sZpU; // if true, can win, if false, can't win
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}

export const resultGameMining = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/mining/resultGameMining', data);
        if (res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance
            });
        }
        if (res.data.histories != null) {
            dispatch({
                type: 'SET_MINING_HISTORY',
                payload: res.data.histories
            });
        }
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}

export const getMiningHistory = (history) => async (dispatch) => {
    try {
        const res = await axiosInstance.get('/mining/getMiningHistory');
        dispatch({
            type: 'SET_MINING_HISTORY',
            payload: res.data.histories
        });
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
    }
}

export const getMiningResult = (history) => async () => {
    try {
        const res = await axiosInstance.get('/mining/getMiningResult');
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}