import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 16;

export function useAblySnakeResult() {
    const [snakeResults, setSnakeResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblySnakeResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("snakesResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, betAmount, winAmount, multiplier } = data;

            const row = {
                userName: userName,
                avatar: avatar,
                betAmount: betAmount,
                winAmount: winAmount,
                isWin: isWin,
                multiplier: multiplier,
            };

            setSnakeResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("SNAKES_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("SNAKES_RESULT", handleMessage);
        };
    }, []);

    return {
        snakeResults,
        setSnakeResults,
    };
}
