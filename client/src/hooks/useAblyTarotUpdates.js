import { useEffect, useState, useRef, useCallback } from "react";
import ablyClient from "../ably/ablyClient";
import { getTarotLiveView } from "action/TarotActions";

function normalizeViewPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
}

/**
 * @param {{ suppressFeedUntil: number, history: object }} opts — hold Ably updates until tarot card reveal finishes.
 */
export function useAblyTarotUpdates({ suppressFeedUntil = 0, history }) {
    const [tarotView, setTarotView] = useState([]);
    const pendingRef = useRef(null);
    const suppressRef = useRef(0);

    suppressRef.current = typeof suppressFeedUntil === "number" ? suppressFeedUntil : 0;

    const flushAfterReveal = useCallback(async () => {
        if (pendingRef.current) {
            setTarotView(pendingRef.current);
            pendingRef.current = null;
            return;
        }
        try {
            const res = await getTarotLiveView(history);
            const raw = res?.data?.data ?? res?.data;
            setTarotView(normalizeViewPayload(raw));
        } catch (err) {
            console.error("[useAblyTarotUpdates] refetch live view", err);
        }
    }, [history]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyTarotUpdates] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("tarotGame");

        const handleMessage = (message) => {
            const data = message.data?.updatedData;
            if (!Array.isArray(data)) return;
            if (suppressRef.current > Date.now()) {
                pendingRef.current = data;
                return;
            }
            setTarotView(data);
        };

        channel.subscribe("tarotUpdate", handleMessage);

        return () => {
            channel.unsubscribe("tarotUpdate", handleMessage);
        };
    }, []);

    useEffect(() => {
        const until = suppressFeedUntil;
        if (!until || until <= Date.now()) {
            return;
        }
        const delay = until - Date.now();
        const id = window.setTimeout(() => {
            flushAfterReveal();
        }, delay);
        return () => clearTimeout(id);
    }, [suppressFeedUntil, flushAfterReveal]);

    return { tarotView, setTarotView };
}
