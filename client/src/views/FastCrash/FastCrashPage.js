import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Input,
  Text,
  VStack,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import ablyClient from "../../ably/ablyClient";
import { trenballScrollbarXStrip, trenballScrollbarY } from "../Trenball/trenballScrollbarStyles";
import {
  getFastCrashState,
  getMyFastCrashHistory,
  patchMyFastCrashHistoryAfterResult,
  placeFastCrashBet,
  prependMyFastCrashBetRow,
} from "action/FastCrashActions";
import { toast } from "react-toastify";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PersonIcon from "@mui/icons-material/Person";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { getUserData } from "action/index";

const PANEL = "#1a1d23";
const CARD = "#25282e";
/** Chart / stats panels — reference #2d3035 / #24262b */
const CHART_BG = "#2d3035";
const CHART_BG_DEEP = "#24262b";
const GREEN = "#4caf50";
const RED = "#f44336";
const VIOLET = "#9c27b0";
const MUTED = "rgba(255,255,255,0.45)";
const LABEL_GRAY = "rgba(255,255,255,0.72)";
const WHITE = "#ffffff";
const TAB_ACTIVE = GREEN;

const PAYOUT = { green: 1.96, red: 1.96, violet: 4.5, number: 9 };
const MIN_BET = 0.0001;
const MAX_LIVE = 60;

const NUM_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

function round2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function round4(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0;
}

function formatBetStr(v) {
  const n = round4(v);
  const s = n.toString();
  return s.length > 8 ? n.toFixed(4) : s;
}

function defer(fn) {
  if (typeof queueMicrotask === "function") queueMicrotask(fn);
  else Promise.resolve().then(fn);
}

function formatGameDisplayId(roundId) {
  if (roundId == null) return "—";
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}${String(roundId).padStart(6, "0")}`;
}

function colorForDigit(d) {
  const n = Math.floor(Number(d));
  if (n === 0 || n === 5) return "violet";
  return n % 2 === 1 ? "green" : "red";
}

function circleBgForDigit(d) {
  const n = Math.floor(Number(d));
  /** Reference: vertical split — 5 = green | violet, 0 = red | violet */
  if (n === 5) return `linear-gradient(90deg, ${GREEN} 50%, ${VIOLET} 50%)`;
  if (n === 0) return `linear-gradient(90deg, ${RED} 50%, ${VIOLET} 50%)`;
  if (n % 2 === 1) return GREEN;
  return RED;
}

/** Baccarat-style bead road: same color stacks in a column; color change starts a new column. */
function buildBeadRoadColumns(recentResults) {
  const list = Array.isArray(recentResults) ? [...recentResults].reverse() : [];
  const cols = [];
  let lastColor = null;
  for (const r of list) {
    const c = r?.color || colorForDigit(r?.digit);
    if (lastColor === null || c !== lastColor) {
      cols.push([r]);
    } else {
      cols[cols.length - 1].push(r);
    }
    lastColor = c;
  }
  return cols;
}

function TrendCircle({ digit, size = "26px" }) {
  const d = Math.floor(Number(digit));
  return (
    <Box
      w={size}
      h={size}
      minW={size}
      minH={size}
      borderRadius="full"
      bg={circleBgForDigit(d)}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="800"
      fontSize="12px"
      color={WHITE}
      boxShadow="0 1px 4px rgba(0,0,0,0.45)"
      flexShrink={0}
    >
      {d}
    </Box>
  );
}

function buildLocalNotification(message, userId) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    notification: message,
    status: "success",
    from: "Fast Crash",
    to: userId || "",
    gameType: "fastcrash",
    unread: true,
    createdAt: new Date().toISOString(),
  };
}

function truncUserLabel(s, n = 10) {
  const t = String(s || "Player");
  return t.length > n ? `${t.slice(0, n)}...` : t;
}

export default function FastCrashPage() {
  const dispatch = useDispatch();
  const userInfo = useSelector((st) => st.user?.userInfo);
  const balance = userInfo?.balance ?? 0;
  const historyRows = Array.isArray(userInfo?.fastcrashHistory) ? userInfo.fastcrashHistory : [];

  const historyRef = useRef([]);
  historyRef.current = historyRows;
  const userIdRef = useRef("");
  userIdRef.current = userInfo?.userId || "";

  const [state, setState] = useState(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [liveRows, setLiveRows] = useState([]);
  const [betAmount, setBetAmount] = useState("0.0001");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("continuous");
  const [selColor, setSelColor] = useState(null);
  const [selDigit, setSelDigit] = useState(null);
  const [showMoreLive, setShowMoreLive] = useState(false);

  const initializedRef = useRef(false);
  const lastSyncRoundIdRef = useRef(null);
  const lastResultRoundIdRef = useRef(null);
  const recentOwnBetIdsRef = useRef(new Map());
  const historyRequestRef = useRef(null);

  const phase = state?.phase || "betting";
  const payouts = state?.payouts || PAYOUT;

  const fetchMyHistoryOnce = useCallback(() => {
    if (historyRequestRef.current) return historyRequestRef.current;
    historyRequestRef.current = getMyFastCrashHistory({ force: true })
      .catch(() => [])
      .finally(() => {
        historyRequestRef.current = null;
      });
    return historyRequestRef.current;
  }, []);

  const dedupeLive = useCallback((rows) => {
    const arr = Array.isArray(rows) ? rows : [];
    const map = new Map();
    for (const r of arr) {
      const key = r?.betId ? `betId:${String(r.betId)}` : `${r?.userId}|${r?.side}|${r?.digit}`;
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values()).slice(0, MAX_LIVE);
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((x) => (x + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const [s, me] = await Promise.all([getFastCrashState(), fetchMyHistoryOnce()]);
        if (!mounted) return;
        if (s?.serverNow != null) {
          setClockOffset(Number(s.serverNow) - Date.now());
          if (s.roundId != null) lastSyncRoundIdRef.current = s.roundId;
        }
        setState(s);
        if (Array.isArray(s?.liveUsers)) setLiveRows(dedupeLive(s.liveUsers));
        dispatch({
          type: "MERGE_USER",
          payload: { fastcrashHistory: Array.isArray(me) ? me.slice(-100) : [] },
        });
      } catch {
        toast.error("Failed to load Fast Crash");
        setClockOffset(0);
      }
    })();

    const channel = ablyClient.channels.get("fastCrashGame");
    const onState = (msg) => {
      const data = msg?.data;
      if (!data) return;
      const prev = lastSyncRoundIdRef.current;
      const roundChanged = data.roundId != null && (prev === null || String(data.roundId) !== String(prev));
      if (data.serverNow && roundChanged) {
        setClockOffset(Number(data.serverNow) - Date.now());
      }
      if (data.roundId != null) lastSyncRoundIdRef.current = data.roundId;
      setState((p) => ({ ...(p || {}), ...data }));
      if (Array.isArray(data.liveUsers)) setLiveRows(dedupeLive(data.liveUsers));
    };
    const onBet = (msg) => {
      const data = msg?.data;
      if (!data) return;
      const incomingBetId = data?.betId ? String(data.betId) : "";
      if (incomingBetId && recentOwnBetIdsRef.current.get(incomingBetId)) {
        recentOwnBetIdsRef.current.delete(incomingBetId);
        defer(() => {
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  greenTotalBet: data.greenTotalBet ?? prev.greenTotalBet,
                  redTotalBet: data.redTotalBet ?? prev.redTotalBet,
                  violetTotalBet: data.violetTotalBet ?? prev.violetTotalBet,
                  numberTotalBet: data.numberTotalBet ?? prev.numberTotalBet,
                }
              : prev
          );
        });
        return;
      }
      defer(() => {
        setLiveRows((prev) => dedupeLive([data, ...(Array.isArray(prev) ? prev : [])]));
        setState((prev) =>
          prev
            ? {
                ...prev,
                greenTotalBet: data.greenTotalBet ?? prev.greenTotalBet,
                redTotalBet: data.redTotalBet ?? prev.redTotalBet,
                violetTotalBet: data.violetTotalBet ?? prev.violetTotalBet,
                numberTotalBet: data.numberTotalBet ?? prev.numberTotalBet,
              }
            : prev
        );
      });
    };
    const onResult = (msg) => {
      const data = msg?.data;
      if (!data?.roundId || data.winningDigit == null) return;
      if (lastResultRoundIdRef.current === data.roundId) return;
      lastResultRoundIdRef.current = data.roundId;
      if (!mounted) return;
      const next = patchMyFastCrashHistoryAfterResult(historyRef.current, {
        roundId: data.roundId,
        winningDigit: data.winningDigit,
        resultColor: data.resultColor,
      });
      dispatch({ type: "MERGE_USER", payload: { fastcrashHistory: next } });
      const row = Array.isArray(next) ? next.find((r) => String(r?.roundId) === String(data.roundId)) : null;
      const winAmt = row ? Number(row.winAmount) : 0;
      if (winAmt > 0) {
        const winMsg = `Won $${winAmt.toFixed(4)} — ${data.winningDigit} (${data.resultColor})`;
        defer(() => {
          toast.success(winMsg);
          dispatch({
            type: "SET_NOTIFICATION",
            payload: buildLocalNotification(winMsg, userIdRef.current),
          });
        });
        getUserData(dispatch).catch(() => {});
      }
    };

    channel.subscribe("FASTCRASH_STATE", onState);
    channel.subscribe("FASTCRASH_NEW_BET", onBet);
    channel.subscribe("FASTCRASH_RESULT", onResult);

    const catchUp = setTimeout(async () => {
      try {
        const snap = await getFastCrashState();
        if (!mounted || !snap) return;
        if (snap.roundId != null && String(snap.roundId) === String(lastSyncRoundIdRef.current)) {
          if (Array.isArray(snap.liveUsers)) setLiveRows(dedupeLive(snap.liveUsers));
          setState((prev) => ({ ...(prev || {}), ...snap }));
        }
      } catch {
        /* ignore */
      }
    }, 900);

    return () => {
      mounted = false;
      clearTimeout(catchUp);
      channel.unsubscribe("FASTCRASH_STATE", onState);
      channel.unsubscribe("FASTCRASH_NEW_BET", onBet);
      channel.unsubscribe("FASTCRASH_RESULT", onResult);
    };
  }, [dedupeLive, dispatch, fetchMyHistoryOnce]);

  const serverNow = Date.now() + clockOffset;
  const timeLeftMs = useMemo(() => {
    if (!state) return 0;
    if (phase === "betting" && state.bettingEndsAt) {
      return Math.max(0, new Date(state.bettingEndsAt).getTime() - serverNow);
    }
    if (phase === "result" && state.roundEndsAt) {
      return Math.max(0, new Date(state.roundEndsAt).getTime() - serverNow);
    }
    return Number(state.timeLeftMs) || 0;
  }, [state, phase, serverNow, tick]);

  const mmss = useMemo(() => {
    const sec = Math.max(0, Math.ceil(timeLeftMs / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [timeLeftMs, tick]);

  const recentDisplay = useMemo(() => {
    const r = Array.isArray(state?.recentResults) ? state.recentResults : [];
    return [...r].reverse();
  }, [state?.recentResults]);

  const probStats = useMemo(() => {
    const r = Array.isArray(state?.recentResults) ? state.recentResults : [];
    const last = r.slice(0, 50);
    let g = 0;
    let rd = 0;
    let v = 0;
    const digitCount = {};
    for (let i = 0; i <= 9; i += 1) digitCount[i] = 0;
    for (const x of last) {
      const c = x?.color || colorForDigit(x?.digit);
      if (c === "green") g += 1;
      else if (c === "red") rd += 1;
      else v += 1;
      const d = Math.floor(Number(x?.digit));
      if (d >= 0 && d <= 9) digitCount[d] += 1;
    }
    const n = last.length;
    const inv = n > 0 ? 100 / n : 0;
    return {
      g,
      rd,
      v,
      digitCount,
      n,
      pctG: g * inv,
      pctR: rd * inv,
      pctV: v * inv,
    };
  }, [state?.recentResults]);

  const beadRoadColumns = useMemo(
    () => buildBeadRoadColumns(Array.isArray(state?.recentResults) ? state.recentResults : []),
    [state?.recentResults]
  );

  const totalPool = useMemo(() => {
    return round2(
      (Number(state?.greenTotalBet) || 0) +
        (Number(state?.redTotalBet) || 0) +
        (Number(state?.violetTotalBet) || 0) +
        (Number(state?.numberTotalBet) || 0)
    );
  }, [state?.greenTotalBet, state?.redTotalBet, state?.violetTotalBet, state?.numberTotalBet]);

  const placeBet = async () => {
    if (phase !== "betting") {
      toast.error("Betting is closed");
      return;
    }
    let side;
    let digit;
    if (selDigit != null) {
      side = "number";
      digit = selDigit;
    } else if (selColor) {
      side = selColor;
    } else {
      toast.error("Select a color or number");
      return;
    }
    const amt = round4(Number(betAmount));
    if (!Number.isFinite(amt) || amt < MIN_BET) {
      toast.error(`Minimum bet is ${MIN_BET}`);
      return;
    }
    if (amt > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    try {
      const res = await placeFastCrashBet({ amount: amt, side, digit }, dispatch);
      const betId = res?.betId;
      if (betId) {
        recentOwnBetIdsRef.current.set(String(betId), Date.now());
        setTimeout(() => recentOwnBetIdsRef.current.delete(String(betId)), 8000);
      }
      dispatch({
        type: "MERGE_USER",
        payload: { fastcrashHistory: prependMyFastCrashBetRow(historyRef.current, res) },
      });
      toast.success("Bet placed");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Bet failed");
    } finally {
      setBusy(false);
    }
  };

  const preset = (v) => {
    const n = Math.max(MIN_BET, round4(Number(v) || 0));
    setBetAmount(String(n));
  };

  const bumpAmount = (delta) => {
    const cur = round4(Number(betAmount) || 0);
    setBetAmount(String(Math.max(MIN_BET, round4(cur + delta))));
  };

  const joinBtn = (colorKey, label, mult, bg, border) => {
    const active = selColor === colorKey && selDigit == null;
    const disabled = busy || phase !== "betting";
    return (
      <Button
        h="auto"
        py={3}
        px={2}
        borderRadius="10px"
        bg={active ? border : CARD}
        borderWidth="2px"
        borderColor={active ? border : "rgba(255,255,255,0.06)"}
        color={WHITE}
        _hover={
          disabled
            ? {}
            : {
                borderColor: border,
                transform: "translateY(-1px)",
                boxShadow: `0 8px 24px ${border}44`,
              }
        }
        isDisabled={disabled}
        onClick={() => {
          setSelColor(colorKey);
          setSelDigit(null);
        }}
        flex="1"
        minW={0}
      >
        <VStack spacing={1} w="100%">
          <RocketLaunchIcon sx={{ fontSize: 22, color: border, opacity: 0.95 }} />
          <Text fontWeight="800" fontSize={{ base: "xs", md: "sm" }}>
            {label}
          </Text>
          <Text fontWeight="900" fontSize={{ base: "md", md: "lg" }} color={border}>
            {String(mult) + "X"}
          </Text>
        </VStack>
      </Button>
    );
  };

  const liveSlice = showMoreLive ? liveRows : liveRows.slice(0, 12);

  return (
    <Flex
      direction="column"
      w="100%"
      maxW={{ base: "100%", xl: "min(100%, 1680px)" }}
      minW={0}
      mx="auto"
      minH={{ base: "calc(100vh - 72px)", md: "calc(100vh - 120px)" }}
      mt={{ base: "72px", md: "104px" }}
      mb={{ base: 4, md: 8 }}
      pt={{ base: 3, md: 5 }}
      px={{ base: 2, md: 4 }}
      pb={6}
    >
      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) minmax(300px, min(36vw, 400px))" }}
        gap={0}
        w="100%"
        borderRadius={{ base: "12px", md: "16px" }}
        border="1px solid rgba(255,255,255,0.07)"
        overflow="hidden"
        bg={PANEL}
      >
        <GridItem minW={0}>
          <VStack align="stretch" spacing={0}>
            {/* Header */}
            <Flex
              px={{ base: 3, md: 4 }}
              py={3}
              align="center"
              justify="space-between"
              borderBottom="1px solid rgba(255,255,255,0.06)"
              bg="#16181d"
            >
              <Text fontWeight="800" fontSize={{ base: "sm", md: "md" }} color={WHITE} letterSpacing="0.02em">
                {formatGameDisplayId(state?.roundId)}
              </Text>
              <HStack spacing={1}>
                <Box w={2} h={2} borderRadius="full" bg={GREEN} />
                <PersonIcon sx={{ fontSize: 18, color: MUTED }} />
                <Text fontWeight="700" color={WHITE} fontSize="sm">
                  {liveRows.length}
                </Text>
              </HStack>
              <Text
                fontWeight="900"
                fontSize={{ base: "lg", md: "xl" }}
                fontFamily="monospace"
                color={WHITE}
                letterSpacing="0.15em"
              >
                {mmss}
              </Text>
            </Flex>

            <Box px={{ base: 3, md: 4 }} py={4} bg={PANEL}>
              <HStack spacing={2} align="stretch" mb={4}>
                {joinBtn("green", "Join Green", payouts.green ?? 1.96, GREEN, GREEN)}
                {joinBtn("violet", "Join Violet", payouts.violet ?? 4.5, VIOLET, VIOLET)}
                {joinBtn("red", "Join Red", payouts.red ?? 1.96, RED, RED)}
              </HStack>

              <Text fontSize="xs" color={MUTED} mb={2} fontWeight="600">
                Pick a number ({payouts.number ?? 9}X)
              </Text>
              <Grid templateColumns="repeat(5, 1fr)" gap={2} mb={1}>
                {NUM_ORDER.map((n) => {
                  const on = selDigit === n && selColor == null;
                  return (
                    <Button
                      key={n}
                      h="42px"
                      borderRadius="8px"
                      bg={on ? "#3d4450" : CARD}
                      color={WHITE}
                      fontWeight="800"
                      fontSize="lg"
                      borderWidth={on ? "2px" : "1px"}
                      borderColor={on ? GREEN : "rgba(255,255,255,0.08)"}
                      isDisabled={busy || phase !== "betting"}
                      onClick={() => {
                        setSelDigit(n);
                        setSelColor(null);
                      }}
                    >
                      {n}
                    </Button>
                  );
                })}
              </Grid>
              <Text textAlign="center" fontSize="xs" color={MUTED}>
                {payouts.number ?? 9}X
              </Text>
            </Box>

            {/* Trend / stats — BC-style chart + tabs at bottom */}
            <Box borderTop="1px solid rgba(255,255,255,0.06)" bg={CHART_BG_DEEP}>
              {phase === "betting" && <Box h="3px" bg={GREEN} boxShadow={`0 0 12px ${GREEN}66`} />}
              <Box px={{ base: 2, md: 3 }} pt={3} pb={1}>
                <Flex justify="space-between" align="center" mb={3} px={1}>
                  <Text fontSize="xs" color={LABEL_GRAY} fontWeight="700" letterSpacing="0.02em">
                    ← Old
                  </Text>
                  <Text fontSize="xs" color={phase === "betting" ? GREEN : MUTED} fontWeight="800" textTransform="uppercase">
                    {phase === "betting" ? "Place your bets" : "Result"}
                  </Text>
                  <Text fontSize="xs" color={LABEL_GRAY} fontWeight="700" letterSpacing="0.02em">
                    New →
                  </Text>
                </Flex>

                {tab === "continuous" && (
                  <Box
                    minH="140px"
                    maxH="280px"
                    overflowX="auto"
                    overflowY="hidden"
                    sx={trenballScrollbarXStrip}
                    bg={CHART_BG}
                    borderRadius="md"
                    border="1px solid rgba(255,255,255,0.06)"
                    py={3}
                    px={2}
                  >
                    <Flex align="flex-end" gap="4px" minW="min-content" minH="120px">
                      {beadRoadColumns.length === 0 && (
                        <Text fontSize="sm" color={MUTED} px={2} py={6}>
                          No history yet — rounds will stack here in columns when the same color repeats.
                        </Text>
                      )}
                      {beadRoadColumns.map((col, ci) => (
                        <VStack
                          key={`col-${ci}`}
                          spacing="3px"
                          justify="flex-end"
                          align="center"
                          minW="28px"
                        >
                          {col.map((r) => (
                            <Tooltip
                              key={`${r.roundId}-${r.digit}`}
                              label={`Round ${r.roundId} → ${r.digit}`}
                              openDelay={250}
                              hasArrow
                            >
                              <Box>
                                <TrendCircle digit={r.digit} size="26px" />
                              </Box>
                            </Tooltip>
                          ))}
                        </VStack>
                      ))}
                      {phase === "betting" && (
                        <VStack spacing="3px" justify="flex-end" minW="28px" align="center">
                          <Tooltip label="Current round" hasArrow>
                            <Box
                              w="26px"
                              h="26px"
                              borderRadius="full"
                              bg="#4a5058"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              color={WHITE}
                              fontWeight="800"
                              fontSize="sm"
                              boxShadow="inset 0 1px 0 rgba(255,255,255,0.08)"
                            >
                              ?
                            </Box>
                          </Tooltip>
                        </VStack>
                      )}
                    </Flex>
                  </Box>
                )}

                {tab === "record" && (
                  <Box
                    position="relative"
                    maxH="260px"
                    overflowY="auto"
                    overflowX="hidden"
                    sx={{
                      ...trenballScrollbarY,
                      maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 92%, transparent 100%)",
                      WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 92%, transparent 100%)",
                    }}
                    bg={CHART_BG}
                    borderRadius="md"
                    border="1px solid rgba(255,255,255,0.06)"
                    p={3}
                  >
                    <Grid
                      templateColumns="repeat(auto-fill, minmax(44px, 1fr))"
                      gap={3}
                      rowGap={4}
                    >
                      {recentDisplay.length === 0 && phase !== "betting" ? (
                        <Box gridColumn="1 / -1" py={6}>
                          <Text fontSize="sm" color={MUTED} textAlign="center">
                            No completed rounds yet.
                          </Text>
                        </Box>
                      ) : (
                        <>
                      {recentDisplay.map((r) => (
                        <VStack key={`${r.roundId}-${r.digit}`} spacing={1} align="center">
                          <Text fontSize="11px" fontWeight="800" color={WHITE} lineHeight="1">
                            {r.roundId}
                          </Text>
                          <TrendCircle digit={r.digit} size="28px" />
                        </VStack>
                      ))}
                      {phase === "betting" && state?.roundId != null && (
                        <VStack spacing={1} align="center">
                          <Text fontSize="11px" fontWeight="800" color={LABEL_GRAY} lineHeight="1">
                            {state.roundId}
                          </Text>
                          <Box
                            w="28px"
                            h="28px"
                            borderRadius="full"
                            bg="#4a5058"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color={WHITE}
                            fontWeight="800"
                            fontSize="sm"
                          >
                            ?
                          </Box>
                        </VStack>
                      )}
                        </>
                      )}
                    </Grid>
                  </Box>
                )}

                {tab === "probability" && (
                  <VStack align="stretch" spacing={4} bg={CHART_BG} borderRadius="md" border="1px solid rgba(255,255,255,0.06)" p={4}>
                    <Text textAlign="center" fontSize="sm" color={LABEL_GRAY} fontWeight="600">
                      Last {probStats.n} times
                    </Text>

                    <VStack spacing={3} align="stretch">
                      <Flex align="center" gap={3}>
                        <Flex
                          w="24px"
                          h="24px"
                          borderRadius="full"
                          bg={GREEN}
                          align="center"
                          justify="center"
                          fontSize="11px"
                          fontWeight="900"
                          color="white"
                          flexShrink={0}
                        >
                          G
                        </Flex>
                        <Box flex="1" h="10px" borderRadius="full" bg="rgba(0,0,0,0.35)" overflow="hidden">
                          <Box h="100%" w={`${probStats.pctG}%`} bg={GREEN} borderRadius="full" transition="width 0.35s ease" />
                        </Box>
                        <Text fontSize="sm" fontWeight="800" color={WHITE} w="28px" textAlign="right">
                          {probStats.g}
                        </Text>
                      </Flex>
                      <Flex align="center" gap={3}>
                        <Flex
                          w="24px"
                          h="24px"
                          borderRadius="full"
                          bg={RED}
                          align="center"
                          justify="center"
                          fontSize="11px"
                          fontWeight="900"
                          color="white"
                          flexShrink={0}
                        >
                          R
                        </Flex>
                        <Box flex="1" h="10px" borderRadius="full" bg="rgba(0,0,0,0.35)" overflow="hidden">
                          <Box h="100%" w={`${probStats.pctR}%`} bg={RED} borderRadius="full" transition="width 0.35s ease" />
                        </Box>
                        <Text fontSize="sm" fontWeight="800" color={WHITE} w="28px" textAlign="right">
                          {probStats.rd}
                        </Text>
                      </Flex>
                      <Flex align="center" gap={3}>
                        <Flex
                          w="24px"
                          h="24px"
                          borderRadius="full"
                          bg={VIOLET}
                          align="center"
                          justify="center"
                          fontSize="11px"
                          fontWeight="900"
                          color="white"
                          flexShrink={0}
                        >
                          V
                        </Flex>
                        <Box flex="1" h="10px" borderRadius="full" bg="rgba(0,0,0,0.35)" overflow="hidden">
                          <Box h="100%" w={`${probStats.pctV}%`} bg={VIOLET} borderRadius="full" transition="width 0.35s ease" />
                        </Box>
                        <Text fontSize="sm" fontWeight="800" color={WHITE} w="28px" textAlign="right">
                          {probStats.v}
                        </Text>
                      </Flex>
                    </VStack>

                    <Grid
                      templateColumns="repeat(5, 1fr)"
                      templateRows="repeat(2, auto)"
                      gap={0}
                      borderWidth="1px"
                      borderColor="rgba(255,255,255,0.1)"
                      borderRadius="md"
                      overflow="hidden"
                    >
                      {NUM_ORDER.map((d) => (
                        <GridItem
                          key={d}
                          borderRightWidth="1px"
                          borderBottomWidth="1px"
                          borderColor="rgba(255,255,255,0.08)"
                        >
                          <VStack spacing={1} py={2} px={1} bg="rgba(0,0,0,0.12)">
                            <Box display="flex" alignItems="center" justifyContent="center">
                              <TrendCircle digit={d} size="24px" />
                            </Box>
                            <Text fontSize="sm" fontWeight="800" color={WHITE}>
                              {probStats.digitCount[d] ?? 0}
                            </Text>
                          </VStack>
                        </GridItem>
                      ))}
                    </Grid>
                  </VStack>
                )}

                {/* Tabs — bottom bar (reference layout) */}
                <Flex
                  mt={4}
                  pt={3}
                  borderTop="1px solid rgba(255,255,255,0.08)"
                  justify="space-around"
                  gap={2}
                >
                  {["continuous", "record", "probability"].map((t) => (
                    <Box
                      key={t}
                      as="button"
                      type="button"
                      flex="1"
                      textAlign="center"
                      pb={2}
                      borderBottom={tab === t ? "3px solid" : "3px solid transparent"}
                      borderColor={tab === t ? TAB_ACTIVE : "transparent"}
                      color={tab === t ? WHITE : MUTED}
                      fontWeight="800"
                      fontSize="sm"
                      transition="color 0.15s ease"
                      _hover={{ color: tab === t ? WHITE : LABEL_GRAY }}
                      onClick={() => setTab(t)}
                    >
                      {t === "continuous" ? "Continuous" : t === "record" ? "Record" : "Probability"}
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Box>

            {/* Amount */}
            <Box px={{ base: 3, md: 4 }} py={4} borderTop="1px solid rgba(255,255,255,0.06)" bg="#16181d">
              <HStack mb={2}>
                <Text fontWeight="800" color={WHITE}>
                  Amount
                </Text>
                <Tooltip label="Min bet 0.0001" fontSize="xs">
                  <HelpOutlineRoundedIcon sx={{ fontSize: 16, color: MUTED, cursor: "help" }} />
                </Tooltip>
              </HStack>
              <HStack spacing={1} mb={3} align="stretch">
                <Flex
                  align="center"
                  pl={3}
                  bg={CARD}
                  borderRadius="12px"
                  borderWidth="1px"
                  borderColor="rgba(255,255,255,0.08)"
                  flex="1"
                  minW={0}
                  h="44px"
                  pr={0}
                >
                  <Text mr={2} color={MUTED} fontSize="sm">
                    $
                  </Text>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={betAmount}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setBetAmount("");
                        return;
                      }
                      if (!/^\d*(\.\d{0,6})?$/.test(raw)) return;
                      setBetAmount(raw);
                    }}
                    onBlur={() => {
                      const p = round4(Number(betAmount));
                      setBetAmount(String(Number.isFinite(p) ? Math.max(MIN_BET, p) : MIN_BET));
                    }}
                    variant="unstyled"
                    color={WHITE}
                    fontWeight="700"
                    fontSize="md"
                    _focus={{ boxShadow: "none" }}
                  />
                  <HStack spacing={0} h="100%">
                    <Button
                      h="100%"
                      borderRadius={0}
                      bg="transparent"
                      borderLeft="1px solid rgba(255,255,255,0.1)"
                      fontSize="xs"
                      onClick={() => preset(round4(Number(betAmount) / 2))}
                    >
                      1/2
                    </Button>
                    <Button
                      h="100%"
                      borderRadius={0}
                      bg="transparent"
                      borderLeft="1px solid rgba(255,255,255,0.1)"
                      fontSize="xs"
                      onClick={() => preset(round4(Number(betAmount) * 2))}
                    >
                      2x
                    </Button>
                    <VStack spacing={0} h="100%" borderLeft="1px solid rgba(255,255,255,0.1)">
                      <IconButton
                        aria-label="up"
                        size="xs"
                        h="50%"
                        borderRadius={0}
                        variant="ghost"
                        icon={<KeyboardArrowUpIcon sx={{ fontSize: 16 }} />}
                        onClick={() => bumpAmount(0.0001)}
                      />
                      <IconButton
                        aria-label="down"
                        size="xs"
                        h="50%"
                        borderRadius={0}
                        variant="ghost"
                        icon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                        onClick={() => bumpAmount(-0.0001)}
                      />
                    </VStack>
                  </HStack>
                </Flex>
              </HStack>
              <HStack spacing={2} mb={4} flexWrap="wrap">
                {[1, 10, 100, 1000].map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    flex="1"
                    minW="calc(25% - 8px)"
                    bg={CARD}
                    color={MUTED}
                    fontWeight="800"
                    _hover={{ bg: "#32363e", color: WHITE }}
                    onClick={() => preset(v)}
                  >
                    {v >= 1000 ? "1.0k" : v}
                  </Button>
                ))}
              </HStack>
              <Button
                w="100%"
                h="48px"
                borderRadius="10px"
                bg={GREEN}
                color="#0e120f"
                fontWeight="900"
                fontSize="md"
                _hover={{ bg: "#5ed36a" }}
                isDisabled={busy || phase !== "betting"}
                onClick={placeBet}
              >
                Bet now
              </Button>
              <HStack mt={3} spacing={3} justify="flex-start">
                <IconButton
                  aria-label="settings"
                  variant="ghost"
                  size="sm"
                  icon={<SettingsIcon sx={{ color: MUTED }} />}
                />
                <Text fontSize="xs" color={MUTED}>
                  Balance: {round4(balance)}
                </Text>
              </HStack>
            </Box>
          </VStack>
        </GridItem>

        {/* Sidebar */}
        <GridItem
          bg="#1e2128"
          borderLeft={{ lg: "1px solid rgba(255,255,255,0.06)" }}
          borderTop={{ base: "1px solid rgba(255,255,255,0.06)", lg: "none" }}
          p={{ base: 3, md: 4 }}
          minW={0}
        >
          <Flex justify="space-between" align="center" mb={3}>
            <HStack>
              <Box w={2} h={2} borderRadius="full" bg={GREEN} />
              <Text fontWeight="800" color={WHITE} fontSize="sm">
                {liveRows.length} Player{liveRows.length === 1 ? "" : "s"}
              </Text>
            </HStack>
            <Text fontWeight="800" color={GREEN} fontSize="sm">
              ${totalPool.toFixed(2)}
            </Text>
          </Flex>
          <Grid templateColumns="1fr 0.9fr 0.9fr 0.7fr" gap={1} mb={2} fontSize="10px" color={MUTED} fontWeight="700" textTransform="uppercase">
            <Text>User</Text>
            <Text>Select</Text>
            <Text textAlign="right">Bet</Text>
            <Text textAlign="right">Profit</Text>
          </Grid>
          <Box maxH={{ base: "280px", md: "min(50vh, 420px)" }} overflowY="auto" sx={trenballScrollbarY}>
            {liveSlice.length === 0 ? (
              <Flex direction="column" align="center" justify="center" py={10} px={2}>
                <Text color={MUTED} fontSize="sm" textAlign="center" fontWeight="600">
                  Stay tuned—something&apos;s coming!
                </Text>
              </Flex>
            ) : (
              liveSlice.map((r, i) => {
                const sel =
                  String(r.side) === "number" && r.digit != null
                    ? `${r.digit}`
                    : String(r.side || "").charAt(0).toUpperCase() + String(r.side || "").slice(1);
                const dot =
                  String(r.side) === "green" ? GREEN : String(r.side) === "red" ? RED : String(r.side) === "violet" ? VIOLET : "#8899aa";
                const isRes = phase === "result" && state?.winningDigit != null;
                let profit = "—";
                if (isRes) {
                  const w = Number(r.amount) || 0;
                  const side = String(r.side || "").toLowerCase();
                  const wd = Math.floor(Number(state.winningDigit));
                  const rc = String(state.resultColor || "").toLowerCase();
                  let win = 0;
                  if (side === "number") {
                    if (Math.floor(Number(r.digit)) === wd) win = round4(w * PAYOUT.number);
                  } else if (["green", "red", "violet"].includes(side) && side === rc) {
                    win = round4(w * PAYOUT[side]);
                  }
                  profit = win > 0 ? `+${win.toFixed(2)}` : `-${w.toFixed(2)}`;
                }
                return (
                  <Grid
                    key={r.betId || i}
                    templateColumns="1fr 0.9fr 0.9fr 0.7fr"
                    gap={1}
                    alignItems="center"
                    py={2}
                    borderBottom="1px solid rgba(255,255,255,0.05)"
                    fontSize="xs"
                  >
                    <HStack minW={0} spacing={1}>
                      <Box w={2} h={2} borderRadius="full" bg={dot} flexShrink={0} />
                      <Text color={WHITE} fontWeight="600" noOfLines={1}>
                        {truncUserLabel(r.userName)}
                      </Text>
                    </HStack>
                    <Text color={WHITE} fontWeight="700">
                      {sel}
                    </Text>
                    <Text color={WHITE} textAlign="right" fontWeight="600">
                      {round2(Number(r.amount) || 0).toFixed(2)}
                    </Text>
                    <Text
                      textAlign="right"
                      fontWeight="700"
                      color={profit.startsWith("+") ? GREEN : profit === "—" ? MUTED : RED}
                    >
                      {profit}
                    </Text>
                  </Grid>
                );
              })
            )}
          </Box>
          {liveRows.length > 12 && (
            <Button
              variant="ghost"
              size="sm"
              w="100%"
              mt={2}
              color={MUTED}
              fontWeight="700"
              onClick={() => setShowMoreLive((s) => !s)}
            >
              {showMoreLive ? "Show less" : "Show more"}
            </Button>
          )}
        </GridItem>
      </Grid>
    </Flex>
  );
}
