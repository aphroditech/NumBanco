import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";
import { setNotification } from "utils/localStorage";

import { setCredentials } from "../store/userSlice";
import { toast } from "react-toastify"


export function useAblyPartnerEarn(userId, dispatch) {

    useEffect(() => {
        if (!ablyClient) {
            console.error("❌ [useAblyPreBetUpdates] Ably client is not initialized.");
            return;
        }
        if (!userId) return;
        const channel = ablyClient.channels.get("partnershipDeposit");

        const handleMessage = (message) => {
            if (message.data && message.data.user === userId) {

                dispatch({
                    type: "SET_USER",
                    payload: message.data.userInfo
                });

                setNotification(message.data.msg, dispatch, "success");
                toast.success(message.data.msg);
            }
        };

        // Subscribe to ticketSold events
        channel.subscribe("partnerEarnDeposit", handleMessage);

        return () => {
            channel.unsubscribe("partnerEarnDeposit", handleMessage);
        };
    }, [userId]);
}