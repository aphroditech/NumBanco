import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ablyClient from "../ably/ablyClient";

import { getUserData } from "action/index";
import { useDispatch } from 'react-redux';
import { setNotification } from 'utils/localStorage';
import { toast } from "react-toastify"

const useAblyDepositStatus = (userId) => {
    const dispatch = useDispatch();
    const [depositText, setDepositText] = useState("Deposit Time");
    const [depositTime, setDepositTime] = useState(null);
    const [depositStatus, setDepositStatus] = useState(null);
    const [depositAmount, setDepositAmount] = useState(0);
    const [txHash, setTxHash] = useState(null);
    const [confirms, setConfirms] = useState(localStorage.getItem("confirm") || 0);
    const user = useSelector((state) => state.user.userInfo) || {};

    useEffect(() => {
        if (!userId) return;
        const channel = ablyClient.channels.get("Num2Bet");

        const confirmFalse = (msg) => {
            console.log("confirm false");
            setDepositStatus(null);
            const { transferTo, transactionHash } = msg.data;
            if (user.wallets.eth?.address.toLowerCase() === transferTo.toLowerCase() || user.wallets.bsc?.address.toLowerCase() === transferTo.toLowerCase() || user.wallets.tron?.address.toLowerCase() === transferTo.toLowerCase()) {
                getUserData(dispatch);
                setTxHash(transactionHash);
                setConfirms(0);
            }
        };
        const confirmTrue = (msg) => {
            console.log("confirm true");
        };
        const confirmSuccess = (msg) => {
            console.log("confirm success");
            const { transferTo } = msg.data;
            if (user.wallets.eth?.address.toLowerCase() === transferTo.toLowerCase() || user.wallets.bsc?.address.toLowerCase() === transferTo.toLowerCase() || user.wallets.tron?.address.toLowerCase() === transferTo.toLowerCase()) {
                dispatch({
                    type: "SET_USER",
                    payload: msg.data.user
                });
                localStorage.removeItem("confirms");
                setNotification(msg.data.message.info, dispatch, msg.data.message.type);
                setDepositStatus("success");
                setDepositText("Deposit Time");
                setDepositAmount(0);
                setConfirms(0);
                setTxHash(null);
                setDepositTime(0);

                setTimeout(() => {
                    setDepositStatus(null);
                }, 3000);
                if (msg.data.message.type === "success") {
                    toast.success(msg.data.message.info);
                } else if (msg.data.message.type === "warning") {
                    toast.warning(msg.data.message.info);
                }
            }
        };
        const confirmUpdate = (msg) => {
            console.log("confirm update");
            setDepositStatus(null);
            const { transferTo } = msg.data;
            if (user.wallets.eth?.address.toLowerCase() === transferTo.toLowerCase() || user.wallets.bsc?.address.toLowerCase() === transferTo.toLowerCase() || user.wallets.tron?.address.toLowerCase() === transferTo.toLowerCase()) {
                if (msg.data.confirmations < 0) return;
                setConfirms(msg.data.confirmations);
                localStorage.setItem("confirms", msg.data.confirmations);
            }
        };
        channel.subscribe("CONFIRM_FALSE", confirmFalse);
        channel.subscribe("CONFIRM_TRUE", confirmTrue);
        channel.subscribe("CONFIRM_SUCCESS", confirmSuccess);
        channel.subscribe("CONFIRMATION_UPDATE", confirmUpdate);
        return () => {
            channel.unsubscribe("CONFIRM_FALSE", confirmFalse);
            channel.unsubscribe("CONFIRM_TRUE", confirmTrue);
            channel.unsubscribe("CONFIRM_SUCCESS", confirmSuccess);
            channel.unsubscribe("CONFIRMATION_UPDATE", confirmUpdate);
        };
    }, [userId]);

    return { depositStatus, setDepositStatus, txHash, setTxHash, confirms, setConfirms, depositAmount, setDepositAmount, depositTime, setDepositTime, depositText, setDepositText };
};

export default useAblyDepositStatus;