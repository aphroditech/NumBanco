import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient"

export function useAblyGraph() {
    const [graphData, setGraphData] = useState(null);

    useEffect(() => {
        const channel = ablyClient.channels.get("Num2Bet");

        // If Ably connection/channel has already failed, avoid subscribing
        if (ablyClient.connection.state === "failed" || channel.state === "failed") {
            console.error(
                "❌ [useAblyGraph] Ably connection/channel is in failed state. Skipping subscribe.",
                ablyClient.connection.errorReason || ""
            );
            return;
        }

        const onGraph = (message) => {
            if (message.data && message.data.alldata) {
                const alldata = Array.isArray(message.data.alldata) 
                    ? [...message.data.alldata] // Create new array reference
                    : [];
                
                setGraphData(alldata);
            } else {
            }
        };

        channel.subscribe("ticketSold", onGraph);

        return () => {
            channel.unsubscribe("ticketSold", onGraph);
        };
    }, []);

    return graphData;
}