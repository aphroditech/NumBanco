import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyJokerCrashUpdates() {
    const [jokerCrashView, setJokerCrashView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyJokerCrashUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("jokerCrashGame");

        const handleMessage = (message) => {
            setJokerCrashView(message.data.updatedData);
        };

        channel.subscribe("jokerCrashUpdate", handleMessage);

        return () => {
            channel.unsubscribe("jokerCrashUpdate", handleMessage);
        };
    }, []);

    return {
        jokerCrashView,
        setJokerCrashView
    };
}