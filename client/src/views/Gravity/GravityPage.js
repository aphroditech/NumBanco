import React, { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, CircularProgress, CircularProgressLabel, Flex, Grid, GridItem, HStack, Input, Progress, Select, Text, useBreakpointValue, useToast, VStack } from "@chakra-ui/react";
import { useDispatch } from "react-redux";
import ablyClient from "../../ably/ablyClient";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import GravityBetHistory from "./GravityItem/BetHistory";
import GravityCanvasChart from "./GravityItem/GravityCanvasChart";
import { getGravityState, getLiveGravityHistory, getMyGravityHistory, placeGravityBet } from "action/GravityActions";
import { getUserData } from "action";

const phaseColor = { betting: "green", viewing: "yellow", result: "red" };

export default function GravityPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState("1");
  const [direction, setDirection] = useState("up");
  const [liveRows, setLiveRows] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());

  const graphHeight = useBreakpointValue({ base: 280, md: 340 }) ?? 280;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [s, me, live] = await Promise.all([getGravityState(), getMyGravityHistory(), getLiveGravityHistory()]);
        if (!mounted) return;
        setState(s);
        setTimeLeft(Math.ceil((s.timeLeftMs || 0) / 1000));
        setLiveRows(s.liveUsers?.length ? s.liveUsers : live);
        setMyHistory(me || []);
      } catch {
        toast({ title: "Failed to load Gravity", status: "error", isClosable: true });
      }
    })();

    const channel = ablyClient.channels.get("gravityGame");
    const onState = (msg) => {
      const data = msg?.data;
      if (!data) return;
      setState((prev) => ({ ...prev, ...data }));
      if (typeof data.timeLeftMs === "number") setTimeLeft(Math.ceil(data.timeLeftMs / 1000));
      if (Array.isArray(data.liveUsers)) setLiveRows(data.liveUsers);
    };
    const onBet = (msg) => {
      const data = msg?.data;
      if (!data) return;
      setLiveRows((prev) => [data, ...prev].slice(0, 40));
      setState((prev) => (prev ? { ...prev, upTotalBet: data.upTotalBet ?? prev.upTotalBet, downTotalBet: data.downTotalBet ?? prev.downTotalBet } : prev));
    };
    const onResult = async () => {
      try {
        const me = await getMyGravityHistory();
        if (mounted) setMyHistory(me || []);
        // Refresh user so navbar notifications show immediately for winners.
        getUserData(dispatch);
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
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Needed so the circular "timeline charge" can smoothly increase 0% -> 100%.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const canBet = state?.phase === "betting";
  const myRoundBets = useMemo(() => {
    const rid = state?.roundId;
    if (!rid) return [];
    return (myHistory || []).filter((h) => String(h?.roundId) === String(rid));
  }, [myHistory, state?.roundId]);

  const myPlacedUp = myRoundBets.some((b) => String(b?.direction).toLowerCase() === "up");
  const myPlacedDown = myRoundBets.some((b) => String(b?.direction).toLowerCase() === "down");

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
  const timelineColor =
    phaseLocal === "betting" ? "#63e486" : phaseLocal === "viewing" ? "#f6ad55" : "#ff6b6b";

  const timeLeftLocal =
    phaseLocal === "betting"
      ? Math.ceil((BETTING_MS - bettingElapsed) / 1000)
      : phaseLocal === "viewing"
      ? Math.ceil((VIEWING_MS - viewingElapsed) / 1000)
      : phaseLocal === "result"
      ? Math.ceil((RESULT_MS - resultElapsed) / 1000)
      : 0;
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
  }, [state]);
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
  const upUsers = useMemo(() => liveRows.filter((r) => String(r.direction).toLowerCase() === "up").slice(0, 7), [liveRows]);
  const downUsers = useMemo(() => liveRows.filter((r) => String(r.direction).toLowerCase() === "down").slice(0, 7), [liveRows]);
  const potentialReturn = (Number(amount || 0) * 1.95).toFixed(2);

  const handleBet = async (dir = direction) => {
    try {
      await placeGravityBet({ amount: Number(amount), direction: dir }, dispatch);
      setDirection(dir);
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Failed to place bet", status: "error", isClosable: true });
    }
  };

  return (
    <Box px={{ base: "8px", md: "16px" }} minH="100vh" mt="90px" w="100%">
      <Grid templateAreas={{ base: `"board" "side" "history"`, xl: `"board side" "history history"` }} templateColumns={{ base: "1fr", xl: "5fr 1.35fr" }} gap="10px">
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
                    <Text color="#61d879" fontSize={{ base: "34px", md: "48px" }} lineHeight="1" fontWeight="800">{upRate.toFixed(0)}%</Text>
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
                    <Text color="#ff6b6b" fontSize={{ base: "34px", md: "48px" }} lineHeight="1" fontWeight="800">{downRate.toFixed(0)}%</Text>
                  </HStack>
                </VStack>

              </Grid>

              <Box
                h={{ base: `400px`, md: `400px` }}
                borderRadius="16px"
                overflow="hidden"
                border="1px solid rgba(0,255,150,0.2)"
                bg="radial-gradient(circle at 50% 0%, rgba(0,255,150,0.25), transparent 55%), 
                radial-gradient(circle at 50% 100%, rgba(255,80,80,0.15), transparent 60%), 
                #05070a"
                boxShadow="0 0 80px rgba(0,255,150,0.15), inset 0 0 60px rgba(0,0,0,0.9)"
                position="relative"
              >
                <Box position="absolute" inset="0" display="flex" alignItems="center" justifyContent="center">
                  <Box w="96%" h="100%">
                    <GravityCanvasChart
                      chartDataDisplay={chartData}
                      previousGraphData={[]}
                      chartMin={chartMin}
                      chartMax={chartMax}
                      chartThreshold={chartThreshold}
                      roundPhase={state?.phase === "betting" ? "trading" : state?.phase}
                      tradingStartSec={10}
                      roundStartAtMs={state?.roundStartAtMs}
                      roundId={state?.roundId}
                      height={350}
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

              <Box mt="10px">
                <Flex justify="space-between">
                  <Text color="rgba(255,255,255,0.7)" fontSize="xs">Graph flows 15s, then freezes to result</Text>
                  <Text color="rgba(255,255,255,0.7)" fontSize="xs">Round: 18s</Text>
                </Flex>
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
                <Button h="46px" bg="linear-gradient(90deg, #ef5d53 0%, #ea564c 100%)" color="white" fontWeight="800" onClick={() => handleBet("down")} isDisabled={!canBet || myPlacedDown}>Down</Button>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem area="side">
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
                  <Box mt="8px" maxH="340px" overflowY="auto">
                    {upUsers.map((u, i) => (
                      <Flex
                        key={`${u.userId || u.userName}-up-${i}`}
                        justify="space-between"
                        py="6px"
                        borderBottom="1px solid rgba(255,255,255,0.08)"
                      >
                        <Text color="white" fontSize="sm">{u.userName || "Unknown"}</Text>
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
                  <Box mt="8px" maxH="340px" overflowY="auto">
                    {downUsers.map((u, i) => (
                      <Flex
                        key={`${u.userId || u.userName}-down-${i}`}
                        justify="space-between"
                        py="6px"
                        borderBottom="1px solid rgba(255,255,255,0.08)"
                      >
                        <Text color="white" fontSize="sm">{u.userName || "Unknown"}</Text>
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

