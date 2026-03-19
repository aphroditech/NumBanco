import axiosInstance from "../api/axiosConfig";

export const checkCanWin = async (data, dispatch) => {
    try {
        const res = await axiosInstance.post('/mining/checkCanWin', data);
        if (res.data.user != null) {
            dispatch({
                type: 'SET_USER',
                payload: res.data.user
            });
        }
        return res.data.M1uXj3sZpU; // if true, can win, if false, can't win
    } catch (error) {
        console.error(error);
        return null;
    }
}

export const resultGameMining = async (data, dispatch) => {
    try {
        const res = await axiosInstance.post('/mining/resultGameMining', data);
        if (res.data.user != null) {
            dispatch({
                type: 'SET_USER',
                payload: res.data.user
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
        return null;
    }
}

export const getMiningHistory = () => async (dispatch) => {
    try {
        const res = await axiosInstance.get('/mining/getMiningHistory');
        dispatch({
            type: 'SET_MINING_HISTORY',
            payload: res.data.histories
        });
    } catch (error) {
        console.error(error);
    }
}

export const getMiningResult = () => async () => {
    try {
        const res = await axiosInstance.get('/mining/getMiningResult');
        return res.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}