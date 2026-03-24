import { useEffect, useState } from "react";
import ablyClient from "../ably/ablyClient";
import { getLiveCloudSpreadHistory } from "../action/CloudSpreadActions";

const MAX_ROWS = 50;

function normalizeRow(data) {
  if (!data || typeof data !== "object") return null;
  const id = data._id;
  const createdAt = data.createdAt;
  return {
    _id: id != null ? String(id) : undefined,
    userId: data.userId,
    userName: data.userName,
    avatar: data.avatar || "",
    targetStep: data.targetStep,
    targetMultiplier: data.targetMultiplier,
    betAmount: data.betAmount,
    sessionStake: data.sessionStake,
    winAmount: data.winAmount,
    isBot: data.isBot,
    isCashOutSummary: data.isCashOutSummary,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : createdAt,
  };
}

/**
 * Cloud Spread public feed: load CloudSpreadHistory from API on mount, then live updates via Ably.
 * Channel: cloudSpreadLive · Event: CLOUD_SPREAD_HISTORY
 */
export function useAblyCloudSpreadLive() {
  const [liveRows, setLiveRows] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel = null;
    let handleMessage = null;

    (async () => {
      try {
        const rows = await getLiveCloudSpreadHistory();
        if (cancelled) return;
        if (Array.isArray(rows) && rows.length > 0) {
          const normalized = rows.map(normalizeRow).filter(Boolean);
          setLiveRows(normalized.slice(0, MAX_ROWS));
        }
      } catch {
        /* ignore — still show Ably-only updates */
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }

      if (cancelled || !ablyClient) {
        if (!ablyClient) {
          console.error("❌ [useAblyCloudSpreadLive] Ably client is not initialized.");
        }
        return;
      }

      channel = ablyClient.channels.get("cloudSpreadLive");

      handleMessage = (message) => {
        const data = message?.data;
        const row = normalizeRow(data);
        if (!row) return;

        setLiveRows((prev) => {
          const id = row._id;
          const withoutDup = id ? prev.filter((r) => String(r._id) !== String(id)) : prev;
          return [row, ...withoutDup].slice(0, MAX_ROWS);
        });
      };

      channel.subscribe("CLOUD_SPREAD_HISTORY", handleMessage);
    })();

    return () => {
      cancelled = true;
      if (channel && handleMessage) {
        channel.unsubscribe("CLOUD_SPREAD_HISTORY", handleMessage);
      }
    };
  }, []);

  return { liveRows, setLiveRows, isInitialLoading };
}
