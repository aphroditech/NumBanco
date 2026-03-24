import axiosInstance from "../api/axiosConfig";

export const pumpingBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/pumping/bet', data);
        if (res.data?.balanceDelta != null) {
            dispatch({
                type: 'UPDATE_USER_BALANCE',
                payload: res.data.balanceDelta
            });
        }
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};

export const getPumpingView = async (history) => {
    try {
        const res = await axiosInstance.get('/pumping/getPumpingView');
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};