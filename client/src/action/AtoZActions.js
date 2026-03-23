import axiosInstance from "../api/axiosConfig";

export const aToZBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/aToZ/bet', data);
        if(res.data.balance != null) {
            dispatch({
                type: 'SET_BALANCE',
                payload: res.data.balance
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

export const aToZSpinComplete = async (result, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/aToZ/spinComplete', result);
        if(res.data.balance != null) {
            dispatch({
                type: 'SET_BALANCE',
                payload: res.data.balance
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

export const getAToZResults = async (history) => {
    try {
        const res = await axiosInstance.get('/aToZ/getAToZResults');
        return res.data;
    } catch (error) {
        console.error(error);
        if (error.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return null;
    }
}