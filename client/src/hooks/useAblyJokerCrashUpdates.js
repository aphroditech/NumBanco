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
            const raw = message?.data?.updatedData;
            const next = Array.isArray(raw) ? raw : raw?.data;
            if (Array.isArray(next)) {
                setJokerCrashView(next);
            }
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