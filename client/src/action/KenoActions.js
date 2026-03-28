import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify";

const mergeDuceUser = (res, dispatch) => {
    setTimeout(() => {
        dispatch({
            type: "MERGE_USER",
            payload: res?.data?.user || {},
        });
    }, 1000);
};

export const kenoBet = async (data, dispatch, history) => {
    try {
        const res = await axiosInstance.post('/keno/bet', data);
        mergeDuceUser(res, dispatch);
        return res.data;
    } catch (err) {
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        if (err.response?.status === 409) {
            toast.error(err.response.data.message);
            return { error: 409 };
        }
        return;
    }
};

export const getKenoView = async (history) => {
    try {
        const res = await axiosInstance.get('/keno/getKenoHistory');
        console.log(res.data);
        return res.data;
    } catch (err) {
        console.error(err);
        if(err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};

export const getKenoControls = async (history) => {
    try {
        const res = await axiosInstance.get('/keno/getKenoControls');

        console.log(res.data);
        return res.data;
    } catch (err) {
        console.error(err);
        return [];
    }
};