import { useEffect } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyCloseModal(onBetEndCallback, userId) {

    useEffect(() => {
        const channel = ablyClient.channels.get("Num2Bet");

        const onTicketCloseModal = (msg) => {
            const data = msg.data;
            
            if(data.userId === userId && onBetEndCallback && typeof onBetEndCallback === 'function') {
                onBetEndCallback();
            }
        }

        channel.subscribe("ticketSold", onTicketCloseModal);
    }, [userId, onBetEndCallback]);
}