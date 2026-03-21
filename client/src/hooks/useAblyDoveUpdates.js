import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyDoveUpdates() {
    const [doveView, setDoveView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyDoveUpdates] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("doveGame");

        const handleMessage = (message) => {
            setDoveView(message.data.updatedData || []);
        };

        channel.subscribe("doveUpdate", handleMessage);

        return () => {
            channel.unsubscribe("doveUpdate", handleMessage);
        };
    }, []);

    return {
        doveView,
        setDoveView
    };
}
