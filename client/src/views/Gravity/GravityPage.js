import React, { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, CircularProgress, CircularProgressLabel, Flex, Grid, GridItem, HStack, Input, Progress, Select, Text, useBreakpointValue, VStack } from "@chakra-ui/react";
import { useDispatch } from "react-redux";
import ablyClient from "../../ably/ablyClient";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import GravityBetHistory from "./GravityItem/BetHistory";
import GravityCanvasChart from "./GravityItem/GravityCanvasChart";
import { getGravityState, getMyGravityHistory, placeGravityBet } from "action/GravityActions";
import { toast } from "react-toastify";

const phaseColor = { betting: "green", viewing: "yellow", result: "red" };
const MAX_LIVE_ROWS = 120;
const MAX_MY_HISTORY_ROWS = 200;

const roundTo2 = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
};

export default function GravityPage() {
  const dispatch = useDispatch();
  const defer = (fn) => setTimeout(fn, 0);
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState("1");
  const [direction, setDirection] = useState("up");
  const [liveRows, setLiveRows] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const roundStartAtMsRef = React.useRef(null);
  // Optimistic UI: immediately disable the button after a successful bet,
  // even before the backend round result refreshes `myHistory`.
  const [optimisticPlacedSides, setOptimisticPlacedSides] = useState({ up: false, down: false });
  const [timeLeft, setTimeLeft] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const initializedRef = React.useRef(false);
  const historyRequestRef = React.useRef(null);
  const lastHistoryFetchAtRef = React.useRef(0);
  const lastResultRoundIdRef = React.useRef(null);
  const lastResultHistorySyncAtRef = React.useRef(0);
  const recentOwnBetIdsRef = React.useRef(new Map());

  const fetchMyHistoryOnce = React.useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastHistoryFetchAtRef.current < 1200) {
      return [];
    }
    if (historyRequestRef.current) return historyRequestRef.current;
    historyRequestRef.current = getMyGravityHistory({ force })
      .then((data) => {
        lastHistoryFetchAtRef.current = Date.now();
        return data;
      })
      .catch(() => [])
      .finally(() => {
        historyRequestRef.current = null;
      });
    return historyRequestRef.current;
  }, []);

  const graphHeight = useBreakpointValue({ base: 280, md: 340 }) ?? 280;

  const dedupeLiveRows = (rows) => {
    const arr = Array.isArray(rows) ? rows : [];
    const map = new Map();

    for (const r of arr) {
      const betId = r?.betId;
      const amountRaw = r?.betAmount ?? r?.amount ?? "";
      const amountNum = Number(amountRaw);
      const amountKey = Number.isFinite(amountNum) ? amountNum.toFixed(2) : String(amountRaw);

      const key = betId
        ? `betId:${String(betId)}`
        : `${String(r?.roundId ?? "")}|${String(r?.userId ?? "")}|${String(r?.direction ?? "")}|${amountKey}`;

      if (!map.has(key)) map.set(key, r);
    }

    return Array.from(map.values()).slice(0, MAX_LIVE_ROWS);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;
    (async () => {
      try {
        const [s, me] = await Promise.all([getGravityState(), fetchMyHistoryOnce()]);
        if (!mounted) return;
        setState(s);
        setTimeLeft(Math.ceil((s.timeLeftMs || 0) / 1000));
        setLiveRows(dedupeLiveRows(Array.isArray(s.liveUsers) ? s.liveUsers : []));
        const initialHistory = Array.isArray(me) ? me.slice(-MAX_MY_HISTORY_ROWS) : [];
        setMyHistory(initialHistory);
      } catch {
        toast.error("Failed to load Gravity");
      }
    })();

    const channel = ablyClient.channels.get("gravityGame");
    const onState = (msg) => {
      const data = msg?.data;
      if (!data) return;
      setState((prev) => ({ ...prev, ...data }));
      if (typeof data.timeLeftMs === "number") setTimeLeft(Math.ceil(data.timeLeftMs / 1000));
      if (Array.isArray(data.liveUsers)) setLiveRows(dedupeLiveRows(data.liveUsers));
    };
    const onBet = (msg) => {
      const data = msg?.data;
      if (!data) return;

      // If this bet was already applied optimistically on this client, skip the heavy list merge.
      const incomingBetId = data?.betId ? String(data.betId) : "";
      if (incomingBetId) {
        const seenAt = recentOwnBetIdsRef.current.get(incomingBetId);
        if (seenAt) {
          recentOwnBetIdsRef.current.delete(incomingBetId);
          defer(() => {
            setState((prev) =>
              prev
                ? {
                    ...prev,
                    upTotalBet: data.upTotalBet ?? prev.upTotalBet,
                    downTotalBet: data.downTotalBet ?? prev.downTotalBet,
                  }
                : prev
            );
          });
          return;
        }
      }

      defer(() => {
        setLiveRows((prev) => {
          const prevArr = Array.isArray(prev) ? prev : [];
          // Prefer betId (backend sends it); fallback to a composite key.
          const key = data?.betId
            ? { betId: String(data.betId) }
            : {
                roundId: String(data?.roundId ?? ""),
                userId: String(data?.userId ?? ""),
                direction: String(data?.direction ?? ""),
              };

          const filtered = prevArr.filter((r) => {
            if (key.betId) return String(r?.betId) !== key.betId;
            return !(
              String(r?.roundId ?? "") === key.roundId &&
              String(r?.userId ?? "") === key.userId &&
              String(r?.direction ?? "") === key.direction
            );
          });

          return dedupeLiveRows([data, ...filtered]);
        });
      });
      defer(() => {
        setState((prev) => (prev ? { ...prev, upTotalBet: data.upTotalBet ?? prev.upTotalBet, downTotalBet: data.downTotalBet ?? prev.downTotalBet } : prev));
      });
    };
    const onResult = async (msg) => {
      const data = msg?.data;
      try {
        if (data && mounted) {
          // Gate graph/phase update until the local expected "result start" time.
          // This prevents the last value from jumping early.
          const BETTING_MS_G = 10000;
          const VIEWING_MS_G = 5000;
          const startAt = typeof roundStartAtMsRef.current === "number" ? roundStartAtMsRef.current : null;
          const elapsed = startAt ? Math.max(0, Date.now() - startAt) : 0;
          const shouldApplyGraph = elapsed >= BETTING_MS_G + VIEWING_MS_G;

          setState((prev) => {
            const base = {
              ...(prev || {}),
              result: data.result ?? prev?.result ?? null,
              upTotalBet: data.upTotalBet ?? prev?.upTotalBet,
              downTotalBet: data.downTotalBet ?? prev?.downTotalBet,
            };

            if (shouldApplyGraph) {
              base.endValue = data.endValue ?? prev?.endValue;
              base.phase = data.phase ?? prev?.phase;
              base.points = Array.isArray(data.points) ? data.points : prev?.points;
            }
            return base;
          });
        }

        const resultRoundId = data?.roundId ?? null;
        if (resultRoundId && lastResultRoundIdRef.current === resultRoundId) {
          return;
        }
        const now = Date.now();
        if (now - lastResultHistorySyncAtRef.current < 3000) {
          return;
        }
        if (resultRoundId) {
          lastResultRoundIdRef.current = resultRoundId;
        }
        lastResultHistorySyncAtRef.current = now;

        const me = await fetchMyHistoryOnce(false);
        if (mounted && Array.isArray(me) && me.length) {
          setMyHistory(me.slice(-MAX_MY_HISTORY_ROWS));
        }
      } catch {}
    };
    channel.subscribe("GRAVITY_STATE", onState);
    channel.subscribe("GRAVITY_NEW_BET", onBet);
    channel.subscribe("GRAVITY_RESULT", onResult);
    return () => {
      mounted = false;
      channel.unsubscribe("GRAVITY_STATE", onState);
      channel.unsubscribe("GRAVITY_NEW_BET", onBet);
      channel.unsubscribe("GRAVITY_RESULT", onResult);
    };
  }, [toast, fetchMyHistoryOnce]);

  // Keep a ref to the server round start timestamp for phase gating.
  useEffect(() => {
    const v = state?.roundStartAtMs;
    if (typeof v === "number") roundStartAtMsRef.current = v;
  }, [state?.roundStartAtMs]);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Needed so the circular "timeline charge" can smoothly increase 0% -> 100%.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const myRoundBets = useMemo(() => {
    const rid = state?.roundId;
    if (!rid) return [];
    return (myHistory || []).filter((h) => String(h?.roundId) === String(rid));
  }, [myHistory, state?.roundId]);

  const hasPlacedRoundBetBase = myRoundBets.length > 0;
  const hasPlacedRoundBet = hasPlacedRoundBetBase || optimisticPlacedSides.up || optimisticPlacedSides.down;
  const myPlacedUp = hasPlacedRoundBet;
  const myPlacedDown = hasPlacedRoundBet;

  useEffect(() => {
    // New round: clear optimistic flags; if user already bet, base flags from `myHistory`
    // will re-disable the buttons after initial load.
    setOptimisticPlacedSides({ up: false, down: false });
  }, [state?.roundId]);

  const upTotal = Number(state?.upTotalBet || 0);
  const downTotal = Number(state?.downTotalBet || 0);
  const upRate = upTotal > 0 ? ((upTotal + downTotal) / upTotal) * 100 : 100;
  const downRate = downTotal > 0 ? ((upTotal + downTotal) / downTotal) * 100 : 100;
  const elapsedMs = typeof state?.roundStartAtMs === "number" ? Math.max(0, nowMs - state.roundStartAtMs) : 0;
  const BETTING_MS = 10000;
  const VIEWING_MS = 5000;
  const RESULT_MS = 3000;

  const bettingElapsed = Math.max(0, Math.min(BETTING_MS, elapsedMs));
  const viewingElapsed = Math.max(0, Math.min(VIEWING_MS, elapsedMs - BETTING_MS));
  const resultElapsed = Math.max(0, Math.min(RESULT_MS, elapsedMs - (BETTING_MS + VIEWING_MS)));

  // Local deterministic phase for the timeline ring (not dependent on Ably update exact second).
  const phaseLocal =
    elapsedMs < BETTING_MS
      ? "betting"
      : elapsedMs < BETTING_MS + VIEWING_MS
      ? "viewing"
      : elapsedMs < BETTING_MS + VIEWING_MS + RESULT_MS
      ? "result"
      : "closed";

  const timelineCharge =
    phaseLocal === "betting"
      ? (bettingElapsed / BETTING_MS) * 100
      : phaseLocal === "viewing"
      ? (viewingElapsed / VIEWING_MS) * 100
      : phaseLocal === "result"
      ? (resultElapsed / RESULT_MS) * 100
      : 100;

  // Use real points to decide up/down color during `result`.
  const resultUptrend = useMemo(() => {
    const pts = state?.points || [];
    if (!pts.length) return null;
    const mapped = pts
      .map((p) => ({ t: Number(p.t), price: Number(p.value) }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.price))
      .sort((a, b) => a.t - b.t);
    if (!mapped.length) return null;
    return mapped[mapped.length - 1].price >= mapped[0].price;
  }, [state?.points]);

  const timelineColor =
    phaseLocal === "betting"
      ? "#63e486"
      : phaseLocal === "viewing"
      ? "#f6ad55"
      : resultUptrend ? "#63e486" : "#ff6b6b";

  const timeLeftLocal =
    phaseLocal === "betting"
      ? Math.ceil((BETTING_MS - bettingElapsed) / 1000)
      : phaseLocal === "viewing"
      ? Math.ceil((VIEWING_MS - viewingElapsed) / 1000)
      : phaseLocal === "result"
      ? Math.ceil((RESULT_MS - resultElapsed) / 1000)
      : 0;

  const canBet = phaseLocal === "betting";
  const chartData = useMemo(() => {
    const raw = (state?.points || [])
      .map((p) => ({
        t: Number(p.t),
        price: Number(p.value),
      }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.price))
      .sort((a, b) => a.t - b.t);

    if (!raw.length) return [];

    // If the backend already returned the full dense set, use it directly.
    // Backend generates: 151 points (0.0s -> 15.0s step 0.1s).
    if (raw.length === 151) {
      const STEP = 0.1;
      const isDense =
        Math.abs(raw[0].t - 0) < 1e-6 &&
        Math.abs(raw[raw.length - 1].t - 15) < 1e-6 &&
        raw.every((p, i) => Math.abs(p.t - Number((i * STEP).toFixed(1))) < 0.01);

      if (isDense) {
        return raw.map((p) => ({ time: p.t, price: p.price }));
      }
    }

    // Guarantee exactly 151 points (0.0s -> 15.0s step 0.1s) for the canvas.
    // This also fixes cases where an already-running round still has older 16-point data.
    const STEP = 0.1;
    const TOTAL = 15;
    const dense = [];

    let idx = 0;
    for (let k = 0; k <= TOTAL / STEP; k += 1) {
      const t = Number((k * STEP).toFixed(1));

      while (idx + 1 < raw.length && raw[idx + 1].t < t) idx += 1;

      if (t <= raw[0].t) {
        dense.push({ time: t, price: raw[0].price });
        continue;
      }
      if (t >= raw[raw.length - 1].t) {
        dense.push({ time: t, price: raw[raw.length - 1].price });
        continue;
      }

      const a = raw[idx];
      const b = raw[idx + 1] ?? raw[idx];
      const dt = (b.t - a.t) || 1;
      const frac = (t - a.t) / dt;
      const price = a.price + (b.price - a.price) * frac;
      dense.push({ time: t, price });
    }

    return dense;
  }, [state?.points]);
  const chartMin = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.min(...chartData.map((d) => d.price)) - 2;
  }, [chartData]);
  const chartMax = useMemo(() => {
    if (!chartData.length) return 100;
    return Math.max(...chartData.map((d) => d.price)) + 2;
  }, [chartData]);
  const chartThreshold = useMemo(() => {
    if (!chartData.length) return 50;
    return chartData[0].price;
  }, [chartData]);
  const upUsers = useMemo(() => {
    const rows = (Array.isArray(liveRows) ? liveRows : []).filter((r) => String(r.direction).toLowerCase() === "up");
    const map = new Map();
    for (const r of rows) {
      const userIdKey = String(r?.userId ?? r?.userName ?? "");
      const prev = map.get(userIdKey) || {
        userId: r?.userId,
        userName: r?.userName,
        avatar: r?.avatar,
        amount: 0,
        betAmount: 0,
      };
      const amt = Number(r?.amount ?? r?.betAmount ?? 0);
      prev.amount = roundTo2(prev.amount + (Number.isFinite(amt) ? amt : 0));
      prev.betAmount = prev.amount;
      map.set(userIdKey, prev);
    }
    return Array.from(map.values()).sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  }, [liveRows]);

  const downUsers = useMemo(() => {
    const rows = (Array.isArray(liveRows) ? liveRows : []).filter((r) => String(r.direction).toLowerCase() === "down");
    const map = new Map();
    for (const r of rows) {
      const userIdKey = String(r?.userId ?? r?.userName ?? "");
      const prev = map.get(userIdKey) || {
        userId: r?.userId,
        userName: r?.userName,
        avatar: r?.avatar,
        amount: 0,
        betAmount: 0,
      };
      const amt = Number(r?.amount ?? r?.betAmount ?? 0);
      prev.amount = roundTo2(prev.amount + (Number.isFinite(amt) ? amt : 0));
      prev.betAmount = prev.amount;
      map.set(userIdKey, prev);
    }
    return Array.from(map.values()).sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  }, [liveRows]);
  const potentialReturn = (Number(amount || 0) * 1.95).toFixed(2);

  const handleBet = async (dir = direction) => {
    try {
      const res = await placeGravityBet({ amount: Number(amount), direction: dir }, dispatch);
      const betId = res?.betId || res?.row?.betId;
      const betAmount = res?.betAmount ?? Number(amount);
      const roundId = res?.roundId ?? state?.roundId;
      const dirNorm = String(dir || "").toLowerCase();
      setOptimisticPlacedSides((prev) => ({ ...prev, [String(dir).toLowerCase()]: true }));

      // Optimistically show the user's own bet in the right-side Up/Down list
      // so UI reflects the click instantly, even if socket echo is delayed/skipped.
      const optimisticRow = {
        ...(res?.row || {}),
        betId: betId ?? res?.row?.betId,
        roundId: roundId ?? res?.row?.roundId,
        direction: dirNorm || String(res?.row?.direction || "").toLowerCase(),
        betAmount,
        amount: betAmount,
        userId: res?.row?.userId ?? res?.user?.userId,
        userName: res?.row?.userName ?? res?.user?.altas,
        avatar: res?.row?.avatar ?? res?.user?.avatar,
      };
      setLiveRows((prev) => dedupeLiveRows([optimisticRow, ...(Array.isArray(prev) ? prev : [])]));

      // Mark as own bet so the immediate Ably echo doesn't trigger duplicate heavy list work.
      if (betId) {
        recentOwnBetIdsRef.current.set(String(betId), Date.now());
      }

      // Keep click path as light as possible; avoid optimistic history row rendering
      // to prevent bettor-only chart hitching. History sync arrives from result event.
      if (betId && roundId) {
        // no-op: intentionally skipping optimistic myHistory update for smoother graph motion
      }

      // Cleanup old ids to keep map tiny.
      const now = Date.now();
      for (const [id, ts] of recentOwnBetIdsRef.current.entries()) {
        if (now - ts > 10000) recentOwnBetIdsRef.current.delete(id);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to place bet");
    }
  };

  return (
    <Box px={{ base: "8px", md: "16px" }} minH="100vh" mt="90px" w="100%">
      <Grid
        templateAreas={{ base: `"board" "side" "history"`, xl: `"board side" "history history"` }}
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 420px" }}
        gap="10px"
      >
        <GridItem area="board">
        <Card
          p="10px"
          bg="rgba(20, 25, 30, 0.75)"
          backdropFilter="blur(12px)"
          border="1px solid rgba(255,255,255,0.06)"
          boxShadow="0 0 30px rgba(0,0,0,0.6)"
        >
            <CardBody flexDirection="column" alignItems="stretch">
              <Grid templateColumns="1fr auto 1fr" alignItems="center" mb="8px" px={{ base: "2px", md: "6px" }}>
                <VStack spacing="0" gridColumn="1 / -1" w="100%">
                  <HStack spacing="12px" align="center" w="100%" justifyContent="center">
                    <Box borderRadius="999px" overflow="hidden">
                      <CircularProgress
                        value={timelineCharge}
                        color={timelineColor}
                        trackColor="rgba(255,255,255,0.16)"
                        thickness="8px"
                        size={{ base: "98px", md: "120px" }}
                      >
                        <CircularProgressLabel
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          textAlign="center"
                        >
                          <VStack spacing="0" lineHeight="1" alignItems="center" justifyContent="center">
                            <Text color={timelineColor} fontWeight="800" fontSize={{ base: "2xl", md: "3xl" }}>{timeLeftLocal}</Text>
                            <Text color={timelineColor} fontWeight="700" fontSize={{ base: "10px", md: "11px" }}>Sec</Text>
                          </VStack>
                        </CircularProgressLabel>
                      </CircularProgress>
                    </Box>
                  </HStack>
                </VStack>

              </Grid>

              <Box
                h={{ base: `400px`, md: `400px` }}
                borderRadius="16px"
                overflow="hidden"
                border="1px solid rgba(0,255,150,0.2)"
                position="relative"
              >
                <Box position="absolute" inset="0" display="flex" alignItems="center" justifyContent="center">
                  <Box w="100%" h="100%">
                    <GravityCanvasChart
                      chartDataDisplay={chartData}
                      previousGraphData={[]}
                      chartMin={chartMin}
                      chartMax={chartMax}
                      chartThreshold={chartThreshold}
                      // Use local deterministic phase to avoid Ably 1s delay.
                      roundPhase={phaseLocal === "betting" ? "trading" : phaseLocal}
                      tradingStartSec={10}
                      roundStartAtMs={state?.roundStartAtMs}
                      roundId={state?.roundId}
                      height={400}
                    />
                  </Box>
                </Box>
                {!canBet && (
                  <Box position="absolute" left="14px" top="12px">
                    <Text color="white" fontSize="2xl" fontWeight="800">No More Orders!</Text>
                    <Text color="white" fontSize="xl" fontWeight="700">Wait For Next Round</Text>
                  </Box>
                )}
              </Box>

              <Text mt="10px" color="rgba(255,255,255,0.8)" fontSize="sm">Amount(USDT): ${Number(amount || 0).toFixed(2)}</Text>
              <HStack mt="6px">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} bg="#1b2025" border="1px solid rgba(255,255,255,0.14)" h="36px" />
              </HStack>
              <Grid mt="8px" templateColumns="repeat(4, 1fr)" gap="8px">
                {[5, 10, 20, 50].map((preset) => (
                  <Button key={preset} h="36px" bg="#2b3138" color="white" border="1px solid rgba(255,255,255,0.12)" _hover={{ bg: "#363d46" }} onClick={() => setAmount(String(preset))}>
                    ${preset}
                  </Button>
                ))}
              </Grid>
              <Grid mt="8px" templateColumns="1fr 1fr" gap="8px">
              <Button
                h="56px"
                fontSize="xl"
                fontWeight="900"
                borderRadius="14px"
                bg="linear-gradient(135deg, #00ff99, #00cc66)"
                position="relative"
                overflow="hidden"
                onClick={() => handleBet("up")}
                _before={{
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent)",
                  transition: "0.6s"
                }}
                _hover={{
                  transform: "translateY(-3px) scale(1.03)",
                  boxShadow: "0 0 40px rgba(0,255,150,0.8)"
                }}
                _active={{ transform: "scale(0.97)" }}
                isDisabled={!canBet || myPlacedUp}
              >
                🚀 UP
              </Button>
                <Button
                  h="56px"
                  fontSize="xl"
                  fontWeight="900"
                  borderRadius="14px"
                  bg="linear-gradient(90deg, #ef5d53 0%, #ea564c 100%)"
                  color="white"
                  position="relative"
                  overflow="hidden"
                  onClick={() => handleBet("down")}
                  isDisabled={!canBet || myPlacedDown}
                  _before={{
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent)",
                    transition: "0.6s"
                  }}
                  _hover={{
                    transform: "translateY(-3px) scale(1.03)",
                    boxShadow: "0 0 40px rgba(231,94,92,0.8)"
                  }}
                  _active={{ transform: "scale(0.97)" }}
                >
                  Down
                </Button>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem area="side" w={{ base: "100%", xl: "420px" }} minW={{ base: "100%", xl: "420px" }}>
          <Card p="8px" bg="#2a2d2e" border="1px solid rgba(255,255,255,0.08)" h="100%">
            <CardBody flexDirection="column" alignItems="stretch">
              <Grid templateColumns="1fr 1fr" gap="8px">
                <Box>
                  <Box
                    borderRadius="10px"
                    border="1px solid rgba(98,214,123,0.25)"
                    bg="linear-gradient(180deg, rgba(98,214,123,0.16) 0%, rgba(25,35,30,0.55) 100%)"
                    p="8px"
                  >
                    <Text color="#61d879" textAlign="center" fontWeight="800">Up</Text>
                    <Text color="#61d879" textAlign="center" fontSize="sm">{upUsers.length} Players</Text>
                  </Box>
                  <Box mt="8px">
                    {upUsers.map((u, i) => (
                      <Flex
                        key={`${u.userId || u.userName}-up-${i}`}
                        justify="space-between"
                        py="6px"
                        borderBottom="1px solid rgba(255,255,255,0.08)"
                      >
                        <Flex align="center" gap="8px" minW="0">
                          <Box
                            as="img"
                            src={u.avatar || "/avatars/pfp1.png"}
                            alt={u.userName || "avatar"}
                            w="26px"
                            h="26px"
                            borderRadius="999px"
                            objectFit="cover"
                            flexShrink="0"
                          />
                          <Text color="white" fontSize="sm" noOfLines={1}>
                            {u.userName || "Unknown"}
                          </Text>
                        </Flex>
                        <Text color="#61d879" fontSize="sm" fontWeight="700">${Number(u.amount || u.betAmount || 0).toFixed(2)}</Text>
                      </Flex>
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Box
                    borderRadius="10px"
                    border="1px solid rgba(231,94,92,0.25)"
                    bg="linear-gradient(180deg, rgba(231,94,92,0.16) 0%, rgba(36,25,26,0.55) 100%)"
                    p="8px"
                  >
                    <Text color="#ff6b6b" textAlign="center" fontWeight="800">Down</Text>
                    <Text color="#ff6b6b" textAlign="center" fontSize="sm">{downUsers.length} Players</Text>
                  </Box>
                  <Box mt="8px">
                    {downUsers.map((u, i) => (
                      <Flex
                        key={`${u.userId || u.userName}-down-${i}`}
                        justify="space-between"
                        py="6px"
                        borderBottom="1px solid rgba(255,255,255,0.08)"
                      >
                        <Flex align="center" gap="8px" minW="0">
                          <Box
                            as="img"
                            src={u.avatar || "/avatars/pfp1.png"}
                            alt={u.userName || "avatar"}
                            w="26px"
                            h="26px"
                            borderRadius="999px"
                            objectFit="cover"
                            flexShrink="0"
                          />
                          <Text color="white" fontSize="sm" noOfLines={1}>
                            {u.userName || "Unknown"}
                          </Text>
                        </Flex>
                        <Text color="#ff6b6b" fontSize="sm" fontWeight="700">${Number(u.amount || u.betAmount || 0).toFixed(2)}</Text>
                      </Flex>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem area="history">
          <GravityBetHistory results={myHistory} />
        </GridItem>
      </Grid>
    </Box>
  );
}

