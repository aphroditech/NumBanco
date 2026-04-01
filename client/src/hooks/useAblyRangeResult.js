import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 16;

export function useAblyRangeResult() {
    const [rangeResults, setRangeResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyRangeResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("rangeResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, betAmount, winAmount, multiplier } = data;
            const messageId = message?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const row = {
                _id: data?._id || messageId,
                userName: userName,
                avatar: avatar,
                betAmount: betAmount,
                winAmount: winAmount,
                isWin: isWin,
                multiplier: multiplier,
                date: data?.date || new Date().toISOString(),
            };

            setRangeResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("RANGE_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("RANGE_RESULT", handleMessage);
        };
    }, []);

    return {
        rangeResults,
        setRangeResults,
    };
}
