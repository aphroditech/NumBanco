import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyCocoUpdates() {
    const [cocoView, setCocoView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyCocoUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("cocoGame");

        const handleMessage = (message) => {
            setCocoView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("cocoUpdate", handleMessage);

        return () => {
            channel.unsubscribe("cocoUpdate", handleMessage);
        };
    }, []);

    return {
        cocoView,
        setCocoView
    };
}