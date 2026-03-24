import axiosInstance from "../api/axiosConfig";

const mergeCardGameUser = (res, dispatch) => {
    dispatch({
        type: "MERGE_USER",
        payload: res?.data?.user || {},
    });
};

export const cardGameBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/cardGame/bet', data);
        mergeCardGameUser(res, dispatch);
        return res.data.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};


export const getCardGameView = async (history) => {
    try {
        const res = await axiosInstance.get('/cardGame/getCardGameView');
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};