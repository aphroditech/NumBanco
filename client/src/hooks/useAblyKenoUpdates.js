import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyKenoUpdates() {
    const [kenoView, setKenoView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyKenoUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("kenoGame");

        const handleMessage = (message) => {
            setKenoView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("kenoUpdate", handleMessage);

        return () => {
            channel.unsubscribe("kenoUpdate", handleMessage);
        };
    }, []);

    return {
        kenoView,
        setKenoView
    };
}