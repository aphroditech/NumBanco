import { useEffect, useState, useRef, useCallback } from "react";
import ablyClient from "../ably/ablyClient";
import { getDiamondLiveView } from "action/DiamondActions";

function normalizeViewPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
}

/**
 * @param {{ suppressFeedUntil: number, history: object }} opts — when suppressFeedUntil > Date.now(), Ably updates are held until the window ends, then applied or ref-loaded (so Live Results follow the 5-board reveal).
 */
export function useAblyDiamondUpdates({ suppressFeedUntil = 0, history }) {
    const [diamondView, setDiamondView] = useState([]);
    const pendingRef = useRef(null);
    const suppressRef = useRef(0);

    suppressRef.current = typeof suppressFeedUntil === "number" ? suppressFeedUntil : 0;

    const flushAfterReveal = useCallback(async () => {
        if (pendingRef.current) {
            setDiamondView(pendingRef.current);
            pendingRef.current = null;
            return;
        }
        try {
            const res = await getDiamondLiveView(history);
            const raw = res?.data?.data ?? res?.data;
            setDiamondView(normalizeViewPayload(raw));
        } catch (err) {
            console.error("[useAblyDiamondUpdates] refetch live view", err);
        }
    }, [history]);

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyDiamondUpdates] Ably client is not initialized.");
            return;
        }

        const channel = ablyClient.channels.get("diamondGame");

        const handleMessage = (message) => {
            const data = message.data?.updatedData;
            if (!Array.isArray(data)) return;
            if (suppressRef.current > Date.now()) {
                pendingRef.current = data;
                return;
            }
            setDiamondView(data);
        };

        channel.subscribe("diamondUpdate", handleMessage);

        return () => {
            channel.unsubscribe("diamondUpdate", handleMessage);
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

    return { diamondView, setDiamondView };
}
