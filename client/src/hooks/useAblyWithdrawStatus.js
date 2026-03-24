import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import ablyClient from "../ably/ablyClient";

// Global set to track processed transactions across all hook instances
const processedTxHashes = new Set();

const useAblyWithdrawStatus = (showToastr = null, userId) => {
  const dispatch = useDispatch();
  const [withdrawStatus, setWithdrawStatus] = useState(() => {
    // Initialize from localStorage to persist across page navigations
    const saved = localStorage.getItem(`withdrawStatus_${userId}`);
    return saved || null;
  });
  const [txHash, setTxHash] = useState(null);

  const lastTxRef = useRef(null);
  const channelRef = useRef(null);
  const isMountedRef = useRef(true);
  const user = useSelector((state) => state.user.userInfo) || {};

  // Wrapper to persist withdrawStatus to localStorage
  const setWithdrawStatusWithPersist = (status) => {
    
    if (isMountedRef.current) {
      setWithdrawStatus(status);

      if (status) {
        localStorage.setItem(`withdrawStatus_${userId}`, status);
      } else {
        localStorage.removeItem(`withdrawStatus_${userId}`);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!userId) {
      // console.warn("Ably hook: userId not ready");
      return;
    }

    const channel = ablyClient.channels.get("WITHDRAW");
    channelRef.current = channel;

    channel.attach((err) => {
      if (err) {
        // console.error("Ably channel attach failed:", err);
      } else {
        // console.log("Ably channel attached: Num2Bet");
      }
    });

    const handleSuccess = ( msg ) => {
        // console.log("Withdraw hook: WITHDRAW_SUCCESS received:", msg);
        
        if (!msg.data?.txHash) {
            // console.log("No txHash found, skipping");
            return;
        }
        
        if (msg.data?.userId !== userId) {
            // console.log("Message not for this user, skipping. userId:", userId, "msg.userId:", msg.data?.userId);
            return;
        }

        // console.log("Withdraw hook: Processing success message for user:", userId);


        // Only set status for form management - navbar handles notifications
        if (isMountedRef.current) {
            setWithdrawStatusWithPersist("success");
            setTxHash(msg.data.txHash);
            // console.log("Withdraw hook: Set withdrawStatus to success");
        }

        if(userId && showToastr && typeof showToastr === 'function') {
          if (processedTxHashes.has(msg.data.txHash)) {
            return;
          }
          
          // Mark this transaction as processed
          processedTxHashes.add(msg.data.txHash);
          
          const fullTxHash = msg.data.txHash;
          const shortTxHash = fullTxHash
            ? `${fullTxHash.slice(0, 5)}...${fullTxHash.slice(-4)}`
            : "";

          showToastr(`Withdraw successfully. Tx: ${shortTxHash}`, "success");
        }
        
        
    };

    const handleFailed = (msg) => {

      if (msg.data?.userId !== userId) {
          return;
      }


      if (isMountedRef.current) {
          setWithdrawStatusWithPersist("failed");
          // console.log("Withdraw hook: Set withdrawStatus to failed");
      }

      if(userId && showToastr && typeof showToastr === 'function') {
        showToastr(msg.data.error, "error");
      }
      
      // Only set status for form management - navbar handles notifications
      
    };

    channel.subscribe("WITHDRAW_SUCCESS", handleSuccess);
    channel.subscribe("WITHDRAW_FAILED", handleFailed);

    return () => {
      // console.log("Withdraw hook cleanup");
      isMountedRef.current = false;
      if (channel) {
        channel.unsubscribe("WITHDRAW_SUCCESS", handleSuccess);
        channel.unsubscribe("WITHDRAW_FAILED", handleFailed);
      }
      channelRef.current = null;
    };
  }, [userId]);

  return { withdrawStatus, setWithdrawStatus: setWithdrawStatusWithPersist, txHash, setTxHash };
};

export default useAblyWithdrawStatus;
