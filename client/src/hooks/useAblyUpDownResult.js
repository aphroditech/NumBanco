import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";
import { getUserData } from "action";
import { useDispatch } from "react-redux";

const MAX_ROWS = 12;

export function useAblyUpDownResult() {
    const [upDownResults, setUpDownResults] = useState([]);
    const dispatch = useDispatch();
    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyUpDownResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("Gravity");

        const handleMessage = (message) => {
            const data = message?.data;
            getUserData(dispatch);
            if (!data) return;

            setUpDownResults(data);
        };

        channel.subscribe("updown:round-result", handleMessage);

        return () => {
            channel.unsubscribe("updown:round-result", handleMessage);
        };
    }, []);

    return {
        upDownResults,
        setUpDownResults,
    };
}
