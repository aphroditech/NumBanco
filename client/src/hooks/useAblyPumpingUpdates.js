import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyPumpingUpdates() {
    const [pumpingView, setPumpingView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyPumpingUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("pumpingGame");

        const handleMessage = (message) => {
            setPumpingView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("pumpingUpdate", handleMessage);

        return () => {
            channel.unsubscribe("pumpingUpdate", handleMessage);
        };
    }, []);

    return {
        pumpingView,
        setPumpingView
    };
}