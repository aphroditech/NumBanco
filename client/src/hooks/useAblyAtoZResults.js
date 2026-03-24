import { useEffect, useState } from "react";

import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 20;

export function useAblyAtoZResults() {
    const [aToZResults, setAToZResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyAtoZResults] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("aToZResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, betAmount, winAmount, date, multiplier } = data;

            const row = {
                userName: userName,
                avatar: avatar,
                betAmount: betAmount,
                winAmount: winAmount,
                date: date,
                isWin: isWin,
                multiplier: multiplier,
            };

            setAToZResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("A_TO_Z_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("A_TO_Z_RESULT", handleMessage);
        };
    }, []);

    return {
        aToZResults,
        setAToZResults,
    };
}
