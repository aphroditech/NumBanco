import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyAlphaTreeUpdates() {
    const [alphaTreeView, setAlphaTreeView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyAlphaTreeUpdates] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("alphaTreeGame");

        const handleMessage = (message) => {
            setAlphaTreeView(message.data.updatedData);
        };

        channel.subscribe("alphaTreeUpdate", handleMessage);

        return () => {
            channel.unsubscribe("alphaTreeUpdate", handleMessage);
        };
    }, []);

    return {
        alphaTreeView,
        setAlphaTreeView,
    };
}
