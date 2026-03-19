import axiosInstance from "../api/axiosConfig";

export const getPreBetData = async (betId, level, history) => {
    try {
        const res = await axiosInstance.get("/preBet/preBetData", {
            params: { betId, level }
        });
        return res.data;
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }

        return { soldTickets: [], sellTicketCnt: 0 };
    }
};