import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyBetUpdates(betId) {
    const [betData, setBetData] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyBetUpdates] Ably client is not initialized.");
            return;
        }
        
        const channel = ablyClient.channels.get("Num2Bet");

        const handleMessage = (message) => {
            if (message.data && message.data.alldata) {
                const alldata = Array.isArray(message.data.alldata) 
                    ? [...message.data.alldata] // Create new array reference
                    : [];
                
                setBetData(alldata);
            } else {
                // console.log("message.data", message.data);
            }
        };

        // Subscribe to ticketSold events
        channel.subscribe("ticketSold", handleMessage);

        return () => {
            channel.unsubscribe("ticketSold", handleMessage);
        };
    }, [betId]);

    return {
        betData,
        setBetData
    };
}