// import { setCredentials } from "../store/userSlice";
import axiosInstance from "../api/axiosConfig";

import { setNotification } from "utils/localStorage";
import { toast } from "react-toastify"

export const NotToken = (history) => {
    const token = localStorage.getItem("token");
    if (!token) {
        toast.error("You have to sign in first!");
        return true;
    }
    return false;
}

export const setUserRedux = (res, dispatch, history = null, isShowNotification = true) => {
    const data = res.data;
    dispatch({
        type: "SET_USER",
        payload: data.user
    });
    dispatch({
        type: "INITIALIZED_NOTIFICATION",
        payload: data.user?.notification || []
    });

    if (res.data.message) {
        if (isShowNotification) setNotification(res.data.message, dispatch, "success");
        // toast.success(res.data.message);
        toast.success(res.data.message);
    }
    if (history) {
        history.push("/user/dashboard");
    }
};

export const getUserData = async (dispatch) => {
    try {
        const res = await axiosInstance.get("/auth/");
        setUserRedux(res, dispatch);
    } catch (err) {
        console.error(err);
    }
};

export const getActiveUsers = async (dispatch) => {
    try {
        const res = await axiosInstance.get("/auth/activeUsers");
        dispatch({
            type: "ACTIVE_USER",
            payload: res.data
        });
    } catch (err) {
        console.error(err);
    }
};