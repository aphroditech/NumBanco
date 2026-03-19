import { useEffect, useRef, useState, useCallback } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyTicketUpdates(currentUserId, betId, level) {
    const channelRef = useRef(null);
    const isMountedRef = useRef(false);

    const [soldTickets, setSoldTickets] = useState([]);
    const [timing, setTiming] = useState([]);
    const [ticketOwners, setTicketOwners] = useState({});
    const [connectionStatus, setConnectionStatus] = useState("connecting");
    const [isConnected, setIsConnected] = useState(false);
    const [currentBetData, setCurrentBetData] = useState({});

    // ✅ SAFE message handler
    const handleTicketSold = useCallback((message) => {
        if (!isMountedRef.current) return;
        try {
            const data = message?.data;
            if (!data) return;
            
            const {
                currentdata,
                ticket,
                tickets,
                userId,
                betId: msgBetId,
                level: msgLevel,
                isBatch
            } = data;

            setCurrentBetData(currentdata);
            if(message.data.betId === betId && message.data.level === level) setTiming(currentdata.timing);
            // Ignore other bets / levels
            if (
                Number(msgBetId) !== Number(betId) || Number(msgLevel) !== Number(level)
            ) {
                return;
            }
            const ownerId = String(userId || "");

            // Batch update
            if (isBatch && Array.isArray(tickets)) {
                const nums = tickets.map(Number);

                setSoldTickets(prev => {
                    const merged = [...new Set([...prev, ...nums])];
                    return merged.sort((a, b) => a - b);
                });

                // setCurrentBetData(prev => {
                //     const merged = [...new Set([...prev, ...nums])];
                //     return merged.sort((a, b) => a - b);
                // })

                setTicketOwners(prev => {
                    const updated = { ...prev };
                    nums.forEach(n => (updated[n] = ownerId));
                    return updated;
                });

                return;
            }

            // Single ticket
            if (!ticket) return;
            const ticketNum = Number(ticket);

            setSoldTickets(prev =>
                prev.includes(ticketNum)
                    ? prev
                    : [...prev, ticketNum].sort((a, b) => a - b)
            );

            setTicketOwners(prev => ({
                ...prev,
                [ticketNum]: ownerId
            }));

        } catch (err) {
            console.error("❌ [useAblyTicketUpdates] Message error:", err);
        }
    }, [betId, level]);

    useEffect(() => {
        isMountedRef.current = true;

        const channelName = "Num2Bet";
        const channel = ablyClient.channels.get(channelName);
        channelRef.current = channel;

        // ✅ Connection listener
        const onConnectionChange = (stateChange) => {
            if (!isMountedRef.current) return;

            setConnectionStatus(stateChange.current);
            setIsConnected(stateChange.current === "connected");
        };

        ablyClient.connection.on(onConnectionChange);

        // If the underlying Ably connection or channel has already failed,
        // avoid subscribing to prevent "channel state is failed" errors.
        if (ablyClient.connection.state === "failed" || channel.state === "failed") {
            console.error(
                "❌ [useAblyTicketUpdates] Ably connection/channel is in failed state. Skipping subscribe.",
                ablyClient.connection.errorReason || ""
            );
            return () => {
                isMountedRef.current = false;
                ablyClient.connection.off(onConnectionChange);
            };
        }

        // ✅ Correct subscribe
        channel.subscribe("ticketSold", handleTicketSold);

        return () => {
            isMountedRef.current = false;

            try {
                // ✅ Correct unsubscribe
                channel.unsubscribe("ticketSold", handleTicketSold);
            } catch (e) {
                console.error("❌ Unsubscribe failed:", e);
            }

            ablyClient.connection.off(onConnectionChange);
        };
    }, [handleTicketSold]);

    return {
        currentBetData,
        setCurrentBetData,
        soldTickets,
        setSoldTickets,
        ticketOwners,
        setTicketOwners,
        timing,
        setTiming,
        connectionStatus,
        isConnected
    };
}