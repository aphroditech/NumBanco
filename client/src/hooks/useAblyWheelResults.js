import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

const MAX_ROWS = 15;

export function useAblyWheelResults() {
    const [wheelResults, setWheelResults] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyWheelResults] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("wheelResult");

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

            setWheelResults((prev) => {
                const next = [row, ...prev];
                return next.slice(0, MAX_ROWS);
            });
        };

        channel.subscribe("WHEEL_RESULT", handleMessage);

        return () => {
            channel.unsubscribe("WHEEL_RESULT", handleMessage);
        };
    }, []);

    return {
        wheelResults,
        setWheelResults,
    };
}
