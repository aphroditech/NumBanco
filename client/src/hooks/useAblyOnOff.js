import { useEffect, useState, useRef } from "react";
import ablyClient from "../ably/ablyClient";

export function useAblyOnOff(dispatch) {
    useEffect(() => {
        const channel = ablyClient.channels.get("Num2Bet");

        const onUser = (msg) => {
            dispatch({
                type: "ACTIVE_USER",
                payload: msg.data,
            });
        };
        const offUser = (msg) => {
            console.log("offline user message received:", msg.data);

            dispatch({
                type: "ACTIVE_USER",
                payload: msg.data,
            });
        };

        channel.subscribe("onlineUser", onUser);
        channel.subscribe("offlineUser", offUser);

        return () => {
            channel.unsubscribe("onlineUser", onUser);
            channel.unsubscribe("offlineUser", offUser);
        };
    }, []);

    return true;
}