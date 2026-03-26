import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyTwistUpdates() {
    const [twistView, setTwistView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyTwistUpdates] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("twistGame");

        const handleMessage = (message) => {
            setTwistView(message.data.updatedData);
        };

        channel.subscribe("twistUpdate", handleMessage);

        return () => {
            channel.unsubscribe("twistUpdate", handleMessage);
        };
    }, []);

    return { twistView, setTwistView };
}

