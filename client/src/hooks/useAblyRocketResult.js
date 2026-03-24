import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 23;

export function useAblyRocketResult() {
    const [rocketResults, setRocketResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyRocketResult] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("rocketResult");

        const handleMessage = (message) => {
            const data = message?.data;
            if (!data) return;

            const { userName, avatar, isWin, bet, win, date, multiplier } = data;

            const row = {
                userName: userName,
                avatar: avatar,
                bet: bet,
                win: win,
                date: date,
                isWin: isWin,
                multiplier: multiplier,
            };

            setRocketResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("ROCKET_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("ROCKET_RESULT", handleMessage);
        };
    }, []);

    return {
        rocketResults,
        setRocketResults,
    };
}
