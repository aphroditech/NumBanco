import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyCardGameUpdates() {
    const [cardGameView, setCardGameView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyCardGameUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("cardGame");

        const handleMessage = (message) => {
            setCardGameView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("cardGameUpdate", handleMessage);

        return () => {
            channel.unsubscribe("cardGameUpdate", handleMessage);
        };
    }, []);

    return {
        cardGameView,
        setCardGameView
    };
}