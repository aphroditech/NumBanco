import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyDiceUpdates() {
    const [diceView, setDiceView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyDiceUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("diceGame");

        const handleMessage = (message) => {
            setDiceView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("diceUpdate", handleMessage);

        return () => {
            channel.unsubscribe("diceUpdate", handleMessage);
        };
    }, []);

    return {
        diceView,
        setDiceView
    };
}