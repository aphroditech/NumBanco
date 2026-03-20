import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyFishingUpdates() {
    const [fishingView, setFishingView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyFishingUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("fishingGame");

        const handleMessage = (message) => {
            console.log("🚀 Fishing view updated", message.data.updatedData);
            setFishingView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("fishingUpdate", handleMessage);

        return () => {
            channel.unsubscribe("fishingUpdate", handleMessage);
        };
    }, []);

    return {
        fishingView,
        setFishingView
    };
}