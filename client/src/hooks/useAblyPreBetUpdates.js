import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";

// Real-time pre-bet updates for all future bets
// Listens on the same "ticketSold" channel that normal bets use,
// but merges incoming betTicket docs into existing state instead of replacing everything.
export function useAblyPreBetUpdates(betId, level) {
    const [preBetData, setPreBetData] = useState([]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyPreBetUpdates] Ably client is not initialized.");
            return;
        }
        const channel = ablyClient.channels.get("Num2Bet");

        const handleMessage = (message) => {
            if (message.data && message.data.alldata && level == message.data.level) {
                setPreBetData(message.data.alldata[0]);
            }
        };
        
        channel.subscribe("ticketSold", handleMessage);

        return () => {
            channel.unsubscribe("ticketSold", handleMessage);
        };
    }, [betId, level]);

    return {
        preBetData,
        setPreBetData
    };
}