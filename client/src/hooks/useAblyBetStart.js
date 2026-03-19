import { useEffect, useState, useRef } from "react";
import ablyClient from "../ably/ablyClient";

import { toast } from "react-toastify"


export function useAblyBetStart(onBetEndCallback, showToasts = false, tierLevel = null) {
    const [betData, setBetData] = useState(null);
    const betEndTimeRef = useRef(null);
    const pendingStartToastRef = useRef(false);
    const [betEndData, setBetEndData] = useState(null);

    useEffect(() => {
        const channel = ablyClient.channels.get("NumBanco");

        // If Ably connection/channel has already failed, avoid subscribing
        // to prevent "channel state is failed" errors.
        if (ablyClient.connection.state === "failed" || channel.state === "failed") {
            console.error(
                "❌ [useAblyBetStart] Ably connection/channel is in failed state. Skipping subscribe.",
                ablyClient.connection.errorReason || ""
            );
            return;
        }

        const onBetStart = (msg) => {
            const data = msg.data;
            if (data.level === 0) {
                const betAStartTime = new Date().getTime();
                sessionStorage.setItem('betAStartTime', betAStartTime);
                sessionStorage.setItem('currentBetIdA', data.betId);
            } else if (data.level === 1) {
                const betBStartTime = new Date().getTime();
                sessionStorage.setItem('betBStartTime', betBStartTime);
                sessionStorage.setItem('currentBetIdB', data.betId);
            } else if (data.level === 2) {
                const betCStartTime = new Date().getTime();
                sessionStorage.setItem('betCStartTime', betCStartTime);
                sessionStorage.setItem('currentBetIdC', data.betId);
            }
            // Filter by tier level - only process events for this tier
            if (tierLevel !== null && data.level !== undefined && data.level !== tierLevel) {
                return; // Ignore events from other tiers
            }
            setBetData(data);
        };

        const onBetEnd = (msg) => {
            const data = msg.data;

            // Filter by tier level - only process events for this tier
            if (tierLevel !== null && data.level !== undefined && data.level !== tierLevel) {
                return; // Ignore events from other tiers
            }
            setBetEndData(data);

            // Show bet end toast only if showToasts is true and this is for the current tier
            if (showToasts && (tierLevel === null || data.level === tierLevel)) {
                const tierName = data.level === 0 ? "Tier A" : data.level === 1 ? "Tier B" : "Tier C";

                // Record the time when bet ended
                betEndTimeRef.current = Date.now();
                pendingStartToastRef.current = true;

                // Show ending toast first
                toast.success(`${tierName} betting round has ended! New betting round has started! `, {
                    duration: 4000,
                    position: "top-right"
                });
            }

            // Call the callback to close the betting component if provided
            if (onBetEndCallback && typeof onBetEndCallback === 'function') {
                onBetEndCallback();
            }
        };

        channel.subscribe("BET_END", onBetEnd);
        channel.subscribe("BET_START", onBetStart);

        return () => {
            channel.unsubscribe("BET_END", onBetEnd);
            channel.unsubscribe("BET_START", onBetStart);
        };
    }, [onBetEndCallback, showToasts, tierLevel]);

    return { betData, betEndData };
}