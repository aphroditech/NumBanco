import axiosInstance from "../api/axiosConfig";

const mergeThreeNumbersUser = (res, dispatch) => {
    dispatch({
        type: "MERGE_USER",
        payload: res?.data?.user || {},
    });
};

export const threeNumbersBet = async (dispatch, history, data) => {
    try {
        const res = await axiosInstance.post('/threeNumbers/bet', data);

        setTimeout(() => {
            mergeThreeNumbersUser(res, dispatch);
        }, 1000);
        return res.data.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return;
    }
};


export const getThreeNumbersView = async (history) => {
    try {
        const res = await axiosInstance.get('/threeNumbers/getThreeNumbersView');
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};