import { useEffect, useState, useRef } from "react";
import ablyClient from "../ably/ablyClient";

const EVENT_POINT = "updown:live-point";
const EVENT_START = "updown:live-start";

export function useAblyUpDownLive(serverPhase) {
    const [liveGraphPoints, setLiveGraphPoints] = useState([]);
    const [cycleStartValue, setCycleStartValue] = useState(null);
    const prevPhaseRef = useRef(null);
    // console.log("server===================>", serverPhase)

    // Don't clear live points on phase change — server owns one continuous timeline. live-start trims and adds.
    useEffect(() => {
        if (serverPhase === "trading" || serverPhase === "result") {
            setCycleStartValue(null);
        }
        prevPhaseRef.current = serverPhase;
    }, [serverPhase]);

    useEffect(() => {
        if (!ablyClient) return;

        const channel = ablyClient.channels.get("Gravity");

        const handlePoint = (message) => {
            // console.log("point============>", message);
            const { time, value } = message.data || {};
            if (typeof time !== "number" || typeof value !== "number") return;
            setLiveGraphPoints((prev) => {
                const next = [...prev, { time, value }].sort((a, b) => a.time - b.time);
                const byTime = new Map(next.map((p) => [p.time, p]));
                return [...byTime.values()].sort((a, b) => a.time - b.time).slice(-1000);
            });
        };

        const handleStart = (message) => {
            // console.log("start==========>", message)
            const { startValue, graphTime } = message.data || {};
            if (typeof startValue !== "number") return;
            const t = typeof graphTime === "number" ? graphTime : 0;
            setLiveGraphPoints((prev) => {
                const minPointsForFullBuffer = 80;
                if (prev.length >= minPointsForFullBuffer) {
                    const alreadyHasStart = prev.some((p) => p.time === t);
                    if (alreadyHasStart) return prev;
                    const next = [...prev, { time: t, value: startValue }].sort((a, b) => a.time - b.time);
                    const byTime = new Map(next.map((p) => [p.time, p]));
                    return [...byTime.values()].sort((a, b) => a.time - b.time).slice(-1000);
                }
                const filtered = prev.filter((p) => p.time < t);
                const next = [...filtered, { time: t, value: startValue }].sort((a, b) => a.time - b.time);
                return next.slice(-1000);
            });
            setCycleStartValue(startValue);
        };

        channel.subscribe(EVENT_POINT, handlePoint);
        channel.subscribe(EVENT_START, handleStart);

        return () => {
            channel.unsubscribe(EVENT_POINT, handlePoint);
            channel.unsubscribe(EVENT_START, handleStart);
        };
    }, []);

    return { liveGraphPoints, setLiveGraphPoints, cycleStartValue, setCycleStartValue };
}
