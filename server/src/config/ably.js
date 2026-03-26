import Ably from "ably";

export const createAblyClient = (name = "default") => {
    const key = process.env.ABLY_API_KEY;
    if (!key) {
        console.error("❌ ABLY_API_KEY missing");
        process.exit(1);
    }

    const ably = new Ably.Realtime({
        key,
        clientId: `server-${name}-${Date.now()}`
    });

    ably.connection.on((stateChange) => {
        console.log(`🔌 Ably: ${stateChange.previous} → ${stateChange.current}`);
        if (stateChange.current === "failed") {
            console.error("❌ Ably failed:", stateChange.reason);
        }
    });

    return ably;
};