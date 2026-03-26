import axiosInstance from '../api/axiosConfig';

export const coinBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/coin/bet', data);
        if(res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance,
            });
        }
        return res.data;
    } catch (error) {
        console.error(error.response?.data?.message);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return null;
    }
};

export const getCoinFlipResults = async (history) => {
    try {
        const res = await axiosInstance.get('/coin/getResults');
        if(res.data.coinResults != null) {
            return res.data.coinResults;
        }
        return null;
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return null;
    }
};

export const coinSpinComplete = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/coin/spinComplete', data);
        if(res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance,
            });
        }
        if(res.data.history != null) {
            dispatch({
                type: 'SET_COIN_HISTORY',
                payload: res.data.history,
            });
        }
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return null;
    }
};

export const getCoinHistory = async (history, dispatch) => {
    try {
        const res = await axiosInstance.get('/coin/getCoinHistory');
        if(res.data.history != null) {
            dispatch({
                type: 'SET_COIN_HISTORY',
                payload: res.data.history,
            });
        }
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return null;
    }
};