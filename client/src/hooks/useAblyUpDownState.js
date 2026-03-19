import { useEffect, useRef } from "react";
import ablyClient from "../ably/ablyClient";

const EVENT_STATE = "updown:state";

/**
 * Subscribe to updown game state via Ably. Calls onStateUpdate when server publishes state.
 * @param {function} onStateUpdate - Called with { phase, phaseEndAt, round, serverTime, graphTimeStart }
 */
export function useAblyUpDownState(onStateUpdate) {
    const onStateUpdateRef = useRef(onStateUpdate);
    onStateUpdateRef.current = onStateUpdate;

    useEffect(() => {
        if (!ablyClient || typeof onStateUpdateRef.current !== "function") return;

        const channel = ablyClient.channels.get("Gravity");

        const handleState = (message) => {
            // console.log(message)
            const d = message.data || {};
            const phase = d.phase;
            const phaseEndAt = d.phaseEndAt ? new Date(d.phaseEndAt) : null;
            const round = d.round || null;
            const serverTime = typeof d.serverTime === "number" ? d.serverTime : null;
            const graphTimeStart = typeof d.graphTimeStart === "number" ? d.graphTimeStart : null;
            const graphDisplaySec = typeof d.graphDisplaySec === "number" ? d.graphDisplaySec : null;
            onStateUpdateRef.current({ phase, phaseEndAt, round, serverTime, graphTimeStart, graphDisplaySec });
        };

        channel.subscribe(EVENT_STATE, handleState);

        return () => {
            channel.unsubscribe(EVENT_STATE, handleState);
        };
    }, []);
}
