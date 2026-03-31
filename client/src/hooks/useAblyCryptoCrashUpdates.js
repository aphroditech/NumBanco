import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyCryptoCrashUpdates() {
    const [cryptoCrashView, setCryptoCrashView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyCryptoCrashUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("cryptoCrashGame");

        const handleMessage = (message) => {
            setCryptoCrashView(message.data.updatedData);
        };

        // Subscribe to ticketSold events
        channel.subscribe("cryptoCrashUpdate", handleMessage);

        return () => {
            channel.unsubscribe("cryptoCrashUpdate", handleMessage);
        };
    }, []);

    return {
        cryptoCrashView,
        setCryptoCrashView
    };
}