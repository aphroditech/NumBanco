import axiosInstance from "../api/axiosConfig";

/** Redux: append one house reveal; reducer keeps newest 3 only (memory — resets on refresh). */
export const setRockLastHouse = (payload) => ({
    type: 'SET_ROCK_LAST_HOUSE',
    payload,
});

export const betRock = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/rock/bet', data);
        if (res.data.isWin) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance
            });
        }
        if (res.data.history != null) {
            dispatch({
                type: 'SET_ROCK_HISTORY',
                payload: res.data.history
            });
        }
        return res.data.isWin;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}

export const rockCashOut = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/rock/cashout', data);
        if (res.data.balance) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance
            });
        }
        if (res.data.history != null) {
            dispatch({
                type: 'SET_ROCK_HISTORY',
                payload: res.data.history
            });
        }
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}

export const getRockHistory = async (history, dispatch) => {
    try {
        const res = await axiosInstance.get('/rock/history');
        if (res.data.history != null) {
            dispatch({
                type: 'SET_ROCK_HISTORY',
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

export const getRockResults = async (history) => {
    try {
        const res = await axiosInstance.get('/rock/results');
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

export const rockBang = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/rock/bang', data);
        if (res.data.history != null) {
            dispatch({
                type: 'SET_ROCK_HISTORY',
                payload: res.data.history
            });
        }
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return null;
    }
}