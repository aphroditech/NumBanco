export const removeSessionStorage = () => {
    sessionStorage.clear();
}

import axiosInstance from "../api/axiosConfig";

export const setNotification = async (str, dispatch, status) => {
    if (!str) return;

    try {
        const res = await axiosInstance.post("/notifications", {
            notification: str,
            status: status
        });

        dispatch({
            type: "SET_NOTIFICATION",
            payload: res.data.notification
        });
    } catch (err) {
        console.error("Failed to save notification:", err);
        const fallback = {
            id: Date.now(),
            notification: str,
            status: status,
            createdAt: new Date(),
            unread: true
        };
        dispatch({
            type: "SET_NOTIFICATION",
            payload: fallback
        });
    }
}