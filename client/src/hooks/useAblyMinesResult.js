import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";
import { getMinesResults } from "action/MinesActions";

const MAX_ROWS = 15;

export function useAblyMinesResult() {
  const [minesResults, setMinesResults] = useState([]);

  // Initial load from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getMinesResults();
      if (!cancelled && Array.isArray(data)) {
        setMinesResults(data.slice(0, MAX_ROWS));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates via Ably
  useEffect(() => {
    if (!ablyClient) {
      console.error("❌ [useAblyMinesResult] Ably client is not initialized.");
      return;
    }

    const channel = ablyClient.channels.get("minesResult");

    const handleMessage = (message) => {
      const data = message?.data;
      if (!data) return;

      const { userName, avatar, isWin, betAmount, winAmount, multiplier } = data;

      const row = {
        userName,
        avatar,
        betAmount,
        winAmount,
        isWin,
        multiplier,
      };

      setMinesResults((prev) => {
        const next = [row, ...prev];
        return next.slice(0, MAX_ROWS);
      });
    };

    channel.subscribe("MINES_RESULT", handleMessage);

    return () => {
      channel.unsubscribe("MINES_RESULT", handleMessage);
    };
  }, []);

  return {
    minesResults,
    setMinesResults,
  };
}

