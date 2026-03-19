import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from ".";


export const cocoSmash = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post("/coco/smash", data);
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        throw err;
    }
};

export const cocoRestart = async (dispatch, history) => {
    try {
        const res = await axiosInstance.post("/coco/restart");
        setUserRedux(res, dispatch);
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        throw err;
    }
};
export const getCocoView = async (history) => {
    try {
        const res = await axiosInstance.get('/coco/getCocoView');
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};