import axiosInstance from '../api/axiosConfig';

export const snakesBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/snakes/bet', data);
        if(res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance,
            });
        }
        return res.data.diceSum;
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return null;
    }
}

export const snakesCashOut = async (data, dispatch) => {
    try {
        const res = await axiosInstance.post('/snakes/cash-out', data);
        if(res.data.balance != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balance,
            });
        }
        if(res.data.history != null) {
            dispatch({
                type: 'SET_SNAKES_HISTORY',
                payload: res.data.history || [],
            });
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}

export const getSnakeResults = async (history) => {
    try {
        const res = await axiosInstance.get('/snakes/results');
        if(res.data.results != null) {
            return res.data.results;
        }
        return [];
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
        return [];
    }
}

export const bangSnake = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/snakes/bang', data);
        if (res.data.history != null) {
            dispatch({
                type: 'SET_SNAKES_HISTORY',
                payload: res.data.history || [],
            });
        }
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing');
        }
    }
}

export const getSnakeHistory = async (history, dispatch) => {
    try {
        const res = await axiosInstance.get('/snakes/history');
        if(res.data.history != null) {
            dispatch({
                type: 'SET_SNAKES_HISTORY',
                payload: res.data.history || [],
            });
        }
    } catch (error) {
        console.error(error);
        if(error.response?.status === 401 && history) {
            history.push('/auth/landing'); 
        }
        return [];
    }
}