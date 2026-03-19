import axiosInstance from "../api/axiosConfig";

import { NotToken, setUserRedux } from "./index";
import { setNotification } from "utils/localStorage";

export const partnershipDeposit = async (dispatch, history) => {
    try {
        const res = await axiosInstance.get("/partnership/partnerDeposit");
        setUserRedux(res, dispatch);

        return "sucess";
    } catch (err) {
        console.error(err);
        setNotification(err.response.data.message, dispatch, "error");
        toast.error(err.response.data.message);
        if (err.response?.status === 401) {
            history.push("/auth/landing");
        }
    }
};
