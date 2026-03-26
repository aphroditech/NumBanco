import { useEffect, useState } from "react";

import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 12;

export function useAblyCoinFlipResult() {
    const [coinFlipResults, setCoinFlipResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyCoinFlipResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("coinFlipResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, betAmount, winAmount, date, flip, result } = data;

            const row = {
                userName: userName,
                avatar: avatar,
                betAmount: betAmount,
                winAmount: winAmount,
                date: date,
                isWin: isWin,
                flip: flip,
                result: result,
            };

            setCoinFlipResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("COIN_FLIP_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("COIN_FLIP_RESULT", handleMessage);
        };
    }, []);

    return {
        coinFlipResults,
        setCoinFlipResults,
    };
}
