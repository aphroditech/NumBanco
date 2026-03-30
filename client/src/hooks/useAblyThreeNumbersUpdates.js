import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyThreeNumbersUpdates() {
    const [threeNumbersView, setThreeNumbersView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyThreeNumbersUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("threeNumbers");

        const handleMessage = (message) => {
            setThreeNumbersView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("threeNumbersUpdate", handleMessage);

        return () => {
            channel.unsubscribe("threeNumbersUpdate", handleMessage);
        };
    }, []);

    return {
        threeNumbersView,
        setThreeNumbersView
    };
}