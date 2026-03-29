import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyClimbUpdates() {
    const [climbView, setClimbView] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyClimbUpdates] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("climbGame");

        const handleMessage = (message) => {
            setClimbView(message.data.updatedData);
        };

        channel.subscribe("climbUpdate", handleMessage);

        return () => {
            channel.unsubscribe("climbUpdate", handleMessage);
        };
    }, []);

    return { climbView, setClimbView };
}
