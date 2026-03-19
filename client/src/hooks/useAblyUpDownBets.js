import { useEffect, useRef } from "react";
import ablyClient from "../ably/ablyClient";

/**
 * Subscribe to updown bets via Ably. Calls onBetPlaced when server publishes a new bet.
 * @param {function} onBetPlaced - Called with bet object { roundId, userId, userName, avatar, direction, amount, createdAt }
 */
export function useAblyUpDownBets(onBetPlaced) {
    const onBetPlacedRef = useRef(onBetPlaced);
    onBetPlacedRef.current = onBetPlaced;

    useEffect(() => {
        if (!ablyClient || typeof onBetPlacedRef.current !== "function") return;

        const channel = ablyClient.channels.get("Gravity");

        const handleBetPlaced = (message) => {
            const d = message.data || {};
            const bet = d.bet || {};
            if (bet.roundId && bet.userId && bet.direction) {
                onBetPlacedRef.current(bet);
            }
        };

        channel.subscribe("bet-placed", handleBetPlaced);

        return () => {
            channel.unsubscribe("bet-placed", handleBetPlaced);
        };
    }, []);
}
