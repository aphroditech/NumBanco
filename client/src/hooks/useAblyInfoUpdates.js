import axiosInstance from "../api/axiosConfig";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ablyClient from "../ably/ablyClient";
import { getUserData } from "action/index";
import { getRealTimeWinners } from "action/AuthActions";

export function useAblyInfoUpdates(isAuth, page) {
    const [winners, setWinners] = useState([]);
    const [time, setTime] = useState(0);
    const history = useHistory();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    useEffect(() => {
        if (isAuth !== false) {
            const channel = ablyClient.channels.get("Num2Bet");

            // If Ably connection/channel has already failed, avoid subscribing
            if (ablyClient.connection.state === "failed" || channel.state === "failed") {
                console.error(
                    "❌ [useAblyInfoUpdates] Ably connection/channel is in failed state. Skipping subscribe.",
                    ablyClient.connection.errorReason || ""
                );
                return;
            }
            const getInfo = async (msg) => {
                const isUser = msg.data.filter(item => item == user.userId);
                if (isUser.length === 1 && user.userId) {
                    getUserData(dispatch);
                }
                if (page === true && user.userId) {
                    const data = await getRealTimeWinners(history);
                    setWinners(data?.realTimeWinners);
                    setTime(data?.time);
                }
            };

            channel.subscribe("GET_INFO", getInfo);

            return () => {
                channel.unsubscribe("GET_INFO", getInfo);
            };
        }
    }, [isAuth]);
    return {
        winners,
        setWinners,
        time,
        setTime
    };
}