import axiosInstance from "../api/axiosConfig";
import { setUserRedux } from "action";
import { offlineUser } from "./BetActions";

import { toast } from "react-toastify"

export const register = async (data, history, dispatch, setIsAuth) => {
    try {
        const res = await axiosInstance.post("/auth/register", data, { withCredentials: true });
        setIsAuth(true);
        localStorage.setItem("token", res.data.token);
        setUserRedux(res, dispatch, history, false);
        return "Success";
    } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || err.message || "Registration failed";
        if (err.response?.status === 502) {
            toast.error("Now the site is not running! Please try again later.");
            return;
        }
        toast.error(errorMessage);
    }
};

export const login = async (data, history, dispatch, setIsAuth) => {
    try {
        const res = await axiosInstance.post("/auth/login", data, { withCredentials: true });

        if (res.data.twofactorRequired) {
            sessionStorage.setItem("2faUser", res.data.userAuthId);
            if (res.data.message) toast.success(res.data.message);
            history.push("/auth/2fa");
            return;
        }

        setIsAuth(true);
        localStorage.setItem("token", res.data.token);
        setUserRedux(res, dispatch, history, false);
        return "Success";
    } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || err.message || "Login failed";
        if (err.response?.status === 502) {
            toast.error("Now the site is not running! Please try again later.");
            return;
        }
        toast.error(errorMessage);
    }
};


export const verify2fa = async (code, history, dispatch, setIsAuth) => {
    try {
        const userAuthId = sessionStorage.getItem("2faUser");
        if (!userAuthId) {
            history.push("/auth/landing");
            return;
        }
        const res = await axiosInstance.post("/auth/verify-2fa", { userAuthId, code }, { withCredentials: true });
        sessionStorage.removeItem("2faUser");
        setIsAuth(true);
        localStorage.setItem("token", res.data.token);
        setUserRedux(res, dispatch, history, false);
    } catch (err) {
        const msg = err.response?.data?.message || "Invalid or expired code";
        toast.error(msg);
    }
};


export const logout = async (history, dispatch, setIsAuth) => {
    try {

        const res = await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
        setIsAuth(false);

        toast.success(res.data.message || "Logged out successfully!");

        offlineUser().then(() => {
            const rememberMe = localStorage.getItem("rememberMe");
            localStorage.clear();
            localStorage.setItem("rememberMe", rememberMe);
            sessionStorage.clear();
            history.push("/auth/landing");
            dispatch({
                type: "CLEAR_USER"
            })
            dispatch({
                type: "REMOVE_NOTIFICATIONS",
                payload: []
            })
        })
    } catch (err) {
        console.error(err);

        if (err.response?.status === 401) {
            // If the token is invalid or expired, we can still clear the local state
            localStorage.clear();
            sessionStorage.clear();
            dispatch({
                type: "CLEAR_USER"
            })
            history.push("/auth/landing");
        }
        return;
    }
}

export const resendEmail = async (userAuthId) => {
    try {
        const res = await axiosInstance.post("/auth/resend-2fa", { userAuthId }, { withCredentials: true });
        toast.success(res.data.message || "Verification code resent!");
        return res.data;

    } catch (err) {
        console.error(err);
        const message = err.response?.data?.message || err.message || "Failed to resend code";
        toast.error(message);
        throw new Error(message);
    }
}

export const getWinners = async (history) => {
    try {
        const res = await axiosInstance.get("/auth/getWinners");
        return res.data;
    } catch (err) {
        console.log(err);
        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
    }
}

export const getRealTimeWinners = async (history) => {
    try {
        const res = await axiosInstance.get("/auth/getRealTimeWinners")
        return res.data;
    } catch (err) {
        console.log(err)
        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
    }
}

export const getInitialUser = async (dispatch, _id) => {
    try {
        const res = axiosInstance.post("/auth/getInitialUser", { _id })
    } catch (err) {
        console.log(err)
    }
}

export const forgotPassword = async (email, history) => {
    try {
        const res = await axiosInstance.post("/auth/forgot-password", { email });
        toast.success(res.data.message || "Password reset link sent!");

        history.push("/auth/signin");

    } catch (err) {
        console.error(err);
        const message = err.response?.data?.message || err.message || "Failed to send reset link";
        toast.error(message);
        return;
    }
}