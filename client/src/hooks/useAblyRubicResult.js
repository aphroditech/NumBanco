import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 12;

export function useAblyRubicResult() {
    const [rubicResults, setRubicResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyRubicResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("rubicResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, betAmount, winAmount } = data;

            const row = {
                userName: userName,
                avatar: avatar,
                betAmount: betAmount,
                winAmount: winAmount,
                isWin: isWin,
            };

            setRubicResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("RUBIC_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("RUBIC_RESULT", handleMessage);
        };
    }, []);

    return {
        rubicResults,
        setRubicResults,
    };
}
