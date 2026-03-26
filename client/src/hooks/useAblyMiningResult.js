import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 10;

export function useAblyMiningResult() {
    const [miningResults, setMiningResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyMiningResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("miningResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, bet, turn, win, date, multiplier } = data;

            const row = {
                userName: userName,
                avatar: avatar,
                bet: bet,
                win: win,
                date: date,
                isWin: isWin,
                multiplier: multiplier,
            };

            setMiningResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("MINING_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("MINING_RESULT", handleMessage);
        };
    }, []);

    return {
        miningResults,
        setMiningResults,
    };
}
