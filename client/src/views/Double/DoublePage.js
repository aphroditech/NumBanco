import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  Image,
  FormControl,
  FormLabel,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useDisclosure,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import GradientBorder from "components/GradientBorder/GradientBorder";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ablyClient from "../../ably/ablyClient";
import {
  getDoubleState,
  getMyDoubleHistory,
  patchMyDoubleHistoryAfterDoubleResult,
  placeDoubleBet,
  prependMyDoubleBetRow,
} from "action/DoubleActions";
import { toast } from "react-toastify";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import DoubleBetHistory from "./DoubleItem/DoubleBetHistory";

const SEGMENTS = 15;
const BETTING_MS = 10000;
const ROLLING_MS = 2000;
const RESULT_MS = 1000;
const ROUND_MS = BETTING_MS + ROLLING_MS + RESULT_MS;

const REEL_SPIN_TRANSITION = "transform 2s cubic-bezier(0.15, 0.85, 0.2, 1)";
const REEL_SPIN_DURATION_MS = 2000;

const BOX_BG = "#2a2d2e";
/** Rubic dice panel accent */
const RUBIC_CYAN = "#00D4FF";
const INPUT_INNER_BG = "#323738";

const C = {
  panel: BOX_BG,
  panel2: BOX_BG,
  stage: BOX_BG,
  stageInner: BOX_BG,
  border: "rgba(255,255,255,0.12)",
  cyan: RUBIC_CYAN,
  red: "#f6465d",
  green: "#27d07c",
  black: "#141414",
  blackTile: "#3b4250",
  muted: "#8b949e",
  white: "rgba(248,250,252,0.96)",
};

/** Betting-phase ring: track + amber arc (remaining time), flat caps — matches reference. */
const BET_RING = { arc: "#f5b759", track: "#404548" };
/** Timeline arc colors: betting = amber; rolling = cyan; result / next round = violet (distinct from each other). */
const TIMELINE_RING_ARC = {
  betting: BET_RING.arc,
  rolling: RUBIC_CYAN,
  result: "#a78bfa",
};

/** segment: betting = time to bet; rolling = spin window; result = payout / next-round gap */
function ringRemainingForSegment(elapsedMs, segment) {
  if (segment === "betting") {
    return Math.max(0, BETTING_MS - Math.min(BETTING_MS, elapsedMs));
  }
  if (segment === "rolling") {
    const rollElapsed = Math.max(0, elapsedMs - BETTING_MS);
    return Math.max(0, ROLLING_MS - Math.min(ROLLING_MS, rollElapsed));
  }
  const resElapsed = Math.max(0, elapsedMs - BETTING_MS - ROLLING_MS);
  return Math.max(0, RESULT_MS - Math.min(RESULT_MS, resElapsed));
}

function ringTotalMsForSegment(segment) {
  if (segment === "betting") return BETTING_MS;
  if (segment === "rolling") return ROLLING_MS;
  return RESULT_MS;
}

const BettingCountdownRing = memo(function BettingCountdownRing({
  roundStartAtMs,
  clockOffset,
  segment,
  size = 112,
}) {
  const offsetRef = useRef(clockOffset);
  const totalMs = ringTotalMsForSegment(segment);

  const [remainingMs, setRemainingMs] = useState(() => {
    if (typeof roundStartAtMs !== "number") return totalMs;
    const elapsed = Math.max(0, Date.now() + clockOffset - roundStartAtMs);
    return ringRemainingForSegment(elapsed, segment);
  });

  /** Keep arc + digits aligned with server time the same frame offset/round props change (avoids a visible snap). */
  useLayoutEffect(() => {
    offsetRef.current = clockOffset;
    if (typeof roundStartAtMs !== "number") return;
    const elapsed = Math.max(0, Date.now() + clockOffset - roundStartAtMs);
    setRemainingMs(ringRemainingForSegment(elapsed, segment));
  }, [clockOffset, roundStartAtMs, segment]);

  useEffect(() => {
    if (typeof roundStartAtMs !== "number") return;
    let raf = 0;
    const tick = () => {
      const elapsed = Math.max(0, Date.now() + offsetRef.current - roundStartAtMs);
      setRemainingMs(ringRemainingForSegment(elapsed, segment));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [roundStartAtMs, segment]);

  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const dash = Math.round(c * frac * 100) / 100;
  const displaySec = Math.max(0, Math.ceil(remainingMs / 1000));
  const isCritical = segment === "betting" && displaySec > 0 && displaySec <= 3;
  const half = size / 2;

  const prevDisplaySecRef = useRef(displaySec);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    const prev = prevDisplaySecRef.current;
    if (displaySec === 3 && prev > 3) setPulseKey((k) => k + 1);
    prevDisplaySecRef.current = displaySec;
  }, [displaySec]);

  const baseArcColor =
    segment === "rolling" ? TIMELINE_RING_ARC.rolling : segment === "result" ? TIMELINE_RING_ARC.result : TIMELINE_RING_ARC.betting;
  const ringArcColor = isCritical ? "#f6465d" : baseArcColor;

  return (
    <Box
      position="relative"
      w={`${size}px`}
      h={`${size}px`}
      flexShrink={0}
      role="img"
      aria-label={
        segment === "betting"
          ? `Betting time remaining: ${displaySec} seconds`
          : segment === "rolling"
            ? `Rolling: ${displaySec} seconds`
            : `Result: ${displaySec} seconds until next round`
      }
      sx={{
        contain: "layout paint",
        "@keyframes ringNumberPulse": {
          "0%": { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" },
          "50%": { transform: "scale(1.18)", filter: "drop-shadow(0 0 14px rgba(246,70,93,0.85))" },
          "100%": { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" },
        },
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: "block" }}>
        <g transform={`rotate(-90 ${half} ${half})`}>
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={BET_RING.track}
            strokeWidth={stroke}
          />
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={ringArcColor}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${c}`}
          />
        </g>
      </svg>
      <Flex
        position="absolute"
        inset={0}
        direction="column"
        align="center"
        justify="center"
        pointerEvents="none"
      >
        <Text
          fontSize="34px"
          fontWeight="800"
          color={ringArcColor}
          lineHeight="1"
          letterSpacing="-0.03em"
          textAlign="center"
          minW="52px"
          key={pulseKey}
          sx={{
            fontVariantNumeric: "tabular-nums",
            ...(isCritical
              ? {
                  animation: "ringNumberPulse 0.9s ease-in-out infinite",
                }
              : null),
          }}
        >
          {displaySec}
        </Text>
        <Text fontSize="13px" fontWeight="600" color={ringArcColor} mt="4px" opacity={0.95}>
          Sec
        </Text>
      </Flex>
    </Box>
  );
});

const TILE_W = 62;
const TILE_GAP = 8;
const STEP = TILE_W + TILE_GAP;

/** Fixed slots so the game card height does not jump between betting / rolling / result. */
const DOUBLE_STAGE_HEADER_H = "132px";
const DOUBLE_STAGE_SUBTITLE_H = "88px";
const DOUBLE_PREVIOUS_ROLLS_BLOCK_H = "124px";
/** Previous rolls row: exactly 10 slots; each width = (100% − gaps) / 10. */
const PREVIOUS_ROLLS_COUNT = 10;
const PREVIOUS_ROLLS_GAP_PX = 8;
const PREV_ROLLS_GUTTER_PX = (PREVIOUS_ROLLS_COUNT - 1) * PREVIOUS_ROLLS_GAP_PX;
const PREV_ROLL_SLOT_WIDTH = `calc((100% - ${PREV_ROLLS_GUTTER_PX}px) / ${PREVIOUS_ROLLS_COUNT})`;
// Size of the hex tiles inside the "PREVIOUS ROLLS" strip.
// Keep element width == height so the hexagon keeps its 6 equal sides.
const PREVIOUS_ROLLS_TILE_SIZE = 56;
const PREV_ROLLS_TOTAL_W_PX =
  PREVIOUS_ROLLS_TILE_SIZE * PREVIOUS_ROLLS_COUNT + PREVIOUS_ROLLS_GAP_PX * (PREVIOUS_ROLLS_COUNT - 1);

const HEX_CLIP_PATH = "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)";

/** 15 segments: 7 red, 7 black, 1 green — R,B,R,B,R,B,R | G | B,R,B,R,B,R,B */
const RED_SLOT_INDICES = new Set([0, 2, 4, 6, 9, 11, 13]);

function slotColorType(i) {
  if (i === 7) return "green";
  if (RED_SLOT_INDICES.has(i)) return "red";
  return "black";
}

const RED_ORDER = [0, 2, 4, 6, 9, 11, 13];
const BLACK_ORDER = [1, 3, 5, 8, 10, 12, 14];

/** Face numbers: red 1–7, black 8–14 (green uses ✦ in ReelTile). */
function reelFaceNumber(slotIndex) {
  if (slotIndex === 7) return null;
  const r = RED_ORDER.indexOf(slotIndex);
  if (r !== -1) return r + 1;
  const b = BLACK_ORDER.indexOf(slotIndex);
  if (b !== -1) return b + 8;
  return slotIndex;
}

function ReelTile({ n, fill }) {
  const t = slotColorType(n);
  const face = reelFaceNumber(n);
  const bg = t === "green" ? C.green : t === "red" ? C.red : C.blackTile;
  const fixed = {
    w: `${TILE_W}px`,
    h: `${TILE_W}px`,
    minW: `${TILE_W}px`,
    flexShrink: 0,
  };
  const fluid = {
    w: "100%",
    h: "100%",
    minW: 0,
    minH: 0,
    flexShrink: 1,
  };
  return (
    <Flex
      {...(fill ? fluid : fixed)}
      bg={bg}
      align="center"
      justify="center"
      overflow="hidden"
      sx={{
        clipPath: HEX_CLIP_PATH,
        WebkitClipPath: HEX_CLIP_PATH, // iOS/Safari
        transform: "rotate(90deg)",
        transformOrigin: "50% 50%",
      }}
      boxShadow="0 4px 16px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.25)"
    >
      {t === "green" ? (
        <Text
          fontSize={fill ? { base: "lg", md: "xl" } : "xl"}
          color="white"
          fontWeight="800"
          lineHeight="1"
          style={{ textShadow: "0 0 12px rgba(255,255,255,0.9)" }}
          sx={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        >
          ✦
        </Text>
      ) : (
        <Box
          w={fill ? "58%" : "34px"}
          h={fill ? "58%" : "34px"}
          maxW={fill ? "42px" : undefined}
          maxH={fill ? "42px" : undefined}
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="6px"
          bg="rgba(0,0,0,0.35)"
          border="1px solid rgba(255,255,255,0.12)"
          sx={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        >
          <Text fontSize={fill ? { base: "xs", sm: "sm", md: "md" } : "md"} fontWeight="800" color="white">
            {face ?? n}
          </Text>
        </Box>
      )}
    </Flex>
  );
}

const roundTo2 = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
};

const buildLocalDoubleNotification = (message, userId) => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  notification: message,
  status: "success",
  from: "Double",
  to: userId || "",
  gameType: "double",
  unread: true,
  createdAt: new Date().toISOString(),
});

/** Matches server `deterministicPfpPath` — `client/public/avatars/pfp1..pfp15.png`. */
function doubleLivePfpUrl(userKey) {
  const s = String(userKey || "bot");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const avatarIdx = (Math.abs(hash) % 15) + 1;
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/avatars/pfp${avatarIdx}.png`;
}

const MAX_LIVE_ROWS = 120;

const AMOUNT_MIN = 0.1;
const AMOUNT_MAX_CAP = 50;
/** How often the main page clock updates — keeps phase/labels accurate without 60 full-tree re-renders/sec (stops SVG “graph” reflow). */
const PHASE_UI_TICK_MS = 50;

export default function DoublePage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.userInfo) || {};
  const myUserId = user?.userId;
  const balance = Number(user?.balance ?? 0);
  const amountMax = Math.min(AMOUNT_MAX_CAP, Math.max(AMOUNT_MIN, balance));
  const defer = (fn) => setTimeout(fn, 0);
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState("0.50");
  const [side, setSide] = useState("green");
  const [liveRows, setLiveRows] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  /** null until first server time — avoids rendering countdown with client-only clock then jumping when sync arrives. */
  const [clockOffset, setClockOffset] = useState(null);
  const clockOffsetRef = useRef(null);
  const [reelTranslate, setReelTranslate] = useState(0);
  /** Joined mid-roll: snap to outcome with no CSS transition (must match phase-derived transition). */
  const [skipRollTransition, setSkipRollTransition] = useState(false);
  /** One-shot: animate strip back to idle when entering betting after result/closed (same timing as spin). */
  const [animateIdleReturn, setAnimateIdleReturn] = useState(false);
  const [optimisticPlaced, setOptimisticPlaced] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const initializedRef = useRef(false);
  const historyRequestRef = useRef(null);
  const lastHistoryFetchAtRef = useRef(0);
  const lastResultRoundIdRef = useRef(null);
  const lastWinFxRoundIdRef = useRef(null);
  const lastSyncRoundIdRef = useRef(null);
  const recentOwnBetIdsRef = useRef(new Map());
  const lastAnimatedRoundRef = useRef(null);
  const prevRoundIdRef = useRef(null);
  const lastSeenNonBettingPhaseRef = useRef(null);
  const wasInBettingPhaseRef = useRef(false);
  const idleReturnTimeoutRef = useRef(null);
  const reelContainerRef = useRef(null);
  const [reelWidth, setReelWidth] = useState(360);
  const [showWinFireworks, setShowWinFireworks] = useState(false);
  const [winFireworksAmount, setWinFireworksAmount] = useState("0.00");
  const winFireworksTimeoutRef = useRef(null);
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

  const fetchMyHistoryOnce = useCallback(async (force = false) => {
    if (historyRequestRef.current) return historyRequestRef.current;
    historyRequestRef.current = getMyDoubleHistory({ force })
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

  const dedupeLiveRows = useCallback((rows) => {
    const arr = Array.isArray(rows) ? rows : [];
    const map = new Map();
    for (const r of arr) {
      const betId = r?.betId;
      const key = betId
        ? `betId:${String(betId)}`
        : `${String(r?.roundId ?? "")}|${String(r?.userId ?? "")}|${String(r?.side ?? "")}`;
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values()).slice(0, MAX_LIVE_ROWS);
  }, []);

  useEffect(() => {
    const el = reelContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setReelWidth(el.offsetWidth || 360));
    ro.observe(el);
    setReelWidth(el.offsetWidth || 360);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const [s, me] = await Promise.all([getDoubleState(), fetchMyHistoryOnce()]);
        if (!mounted) return;
        if (s.serverNow) {
          const proposed = Number(s.serverNow) - Date.now();
          setClockOffset(proposed);
          if (s.roundId != null) lastSyncRoundIdRef.current = s.roundId;
        } else {
          setClockOffset(0);
        }
        setState(s);
        // Live bet list (incl. bots): Ably DOUBLE_STATE + DOUBLE_NEW_BET only — not REST /double/state.
        setLiveRows([]);
        setMyHistory(Array.isArray(me) ? me.slice(-100) : []);
      } catch {
        toast.error("Failed to load Double");
        setClockOffset(0);
      }
    })();

    const channel = ablyClient.channels.get("doubleGame");
    const onState = (msg) => {
      const data = msg?.data;
      if (!data) return;
      
      const prevRoundId = lastSyncRoundIdRef.current;
      const roundChanged = data.roundId != null && (prevRoundId === null || String(data.roundId) !== String(prevRoundId));

      if (data.serverNow && roundChanged) {
        const proposed = Number(data.serverNow) - Date.now();
        setClockOffset(proposed);
      }
      if (data.roundId != null) {
        lastSyncRoundIdRef.current = data.roundId;
      }
      setState((prev) => ({ ...prev, ...data }));
      if (Array.isArray(data.liveUsers)) {
        setLiveRows(dedupeLiveRows(data.liveUsers));
      }
    };
    const onBet = (msg) => {
      const data = msg?.data;
      if (!data) return;
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
                    redTotalBet: data.redTotalBet ?? prev.redTotalBet,
                    blackTotalBet: data.blackTotalBet ?? prev.blackTotalBet,
                    greenTotalBet: data.greenTotalBet ?? prev.greenTotalBet,
                  }
                : prev
            );
          });
          return;
        }
      }
      defer(() => {
        setLiveRows((prev) => dedupeLiveRows([data, ...(Array.isArray(prev) ? prev : [])]));
        setState((prev) =>
          prev
            ? {
                ...prev,
                redTotalBet: data.redTotalBet ?? prev.redTotalBet,
                blackTotalBet: data.blackTotalBet ?? prev.blackTotalBet,
                greenTotalBet: data.greenTotalBet ?? prev.greenTotalBet,
              }
            : prev
        );
      });
    };
    const onResult = (msg) => {
      const data = msg?.data;
      try {
        if (data && mounted) {
          setState((prev) => ({
            ...(prev || {}),
            winningSlot: data.winningSlot ?? prev?.winningSlot,
            winningColor: data.winningColor ?? prev?.winningColor,
            phase: data.phase ?? prev?.phase,
          }));
        }
        if (!data?.roundId || data.winningColor == null || data.winningSlot == null) return;
        const resultRoundId = data.roundId;
        if (lastResultRoundIdRef.current === resultRoundId) return;
        lastResultRoundIdRef.current = resultRoundId;
        if (!mounted) return;
        setMyHistory((prev) => {
          const next = patchMyDoubleHistoryAfterDoubleResult(prev, {
            roundId: data.roundId,
            winningColor: data.winningColor,
            winningSlot: data.winningSlot,
          });
          const row = Array.isArray(next)
            ? next.find((r) => String(r?.roundId) === String(data.roundId))
            : null;
          const winAmt = row ? Number(row.winAmount) : 0;
          if (winAmt > 0) {
            // One win toast/notification/fireworks per round.
            if (String(lastWinFxRoundIdRef.current) === String(data.roundId)) return next;
            lastWinFxRoundIdRef.current = data.roundId;
            defer(() => {
              if (!mounted) return;
              setWinFireworksAmount(roundTo2(winAmt).toFixed(2));
              setShowWinFireworks(true);
              const winMsg = `You won $${roundTo2(winAmt).toFixed(2)} on Double round ${data.roundId}`;
              toast.success(winMsg);
              dispatch({
                type: "SET_NOTIFICATION",
                payload: buildLocalDoubleNotification(winMsg, myUserId),
              });
              if (winFireworksTimeoutRef.current) clearTimeout(winFireworksTimeoutRef.current);
              winFireworksTimeoutRef.current = setTimeout(() => {
                setShowWinFireworks(false);
                winFireworksTimeoutRef.current = null;
              }, 2200);
            });
          }
          return next;
        });
      } catch {}
    };
    channel.subscribe("DOUBLE_STATE", onState);
    channel.subscribe("DOUBLE_NEW_BET", onBet);
    channel.subscribe("DOUBLE_RESULT", onResult);

    // Catch-up: if we refreshed mid–betting, we may miss some DOUBLE_NEW_BET events
    // between the initial REST load and Ably subscription attach. Pull one snapshot.
    let catchUpTimer = setTimeout(async () => {
      try {
        const snap = await getDoubleState();
        if (!mounted || !snap) return;
        // Only apply within the same round; this is specifically to fill missing liveUsers.
        if (snap.roundId != null && String(snap.roundId) === String(lastSyncRoundIdRef.current)) {
          if (Array.isArray(snap.liveUsers)) setLiveRows(dedupeLiveRows(snap.liveUsers));
          setState((prev) => ({ ...(prev || {}), ...snap }));
        }
      } catch {
        // ignore
      }
    }, 1000);
    return () => {
      mounted = false;
      if (catchUpTimer) {
        clearTimeout(catchUpTimer);
        catchUpTimer = null;
      }
      if (winFireworksTimeoutRef.current) {
        clearTimeout(winFireworksTimeoutRef.current);
        winFireworksTimeoutRef.current = null;
      }
      channel.unsubscribe("DOUBLE_STATE", onState);
      channel.unsubscribe("DOUBLE_NEW_BET", onBet);
      channel.unsubscribe("DOUBLE_RESULT", onResult);
    };
  }, [dedupeLiveRows, fetchMyHistoryOnce]);

  useLayoutEffect(() => {
    clockOffsetRef.current = clockOffset;
    if (clockOffset == null) return;
    setNowMs(Date.now() + clockOffset);
  }, [clockOffset]);

  useEffect(() => {
    let raf = 0;
    let lastEmit = 0;
    const tick = () => {
      const off = clockOffsetRef.current;
      if (off == null) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Date.now() + off;
      if (lastEmit === 0 || t - lastEmit >= PHASE_UI_TICK_MS) {
        lastEmit = t;
        setNowMs(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    setOptimisticPlaced(false);
  }, [state?.roundId]);

  const elapsedMs = useMemo(() => {
    if (clockOffset == null || typeof state?.roundStartAtMs !== "number") return 0;
    return Math.max(0, nowMs - state.roundStartAtMs);
  }, [nowMs, state?.roundStartAtMs, clockOffset]);

  /** Spin effect must not depend on elapsedMs — rAF updates it every frame and would re-run the effect, clearing refs and killing the CSS transition. */
  const elapsedMsRef = useRef(elapsedMs);
  elapsedMsRef.current = elapsedMs;

  const phaseLocal = useMemo(() => {
    if (clockOffset == null || typeof state?.roundStartAtMs !== "number") return "syncing";
    if (elapsedMs < BETTING_MS) return "betting";
    if (elapsedMs < BETTING_MS + ROLLING_MS) return "rolling";
    if (elapsedMs < ROUND_MS) return "result";
    return "closed";
  }, [clockOffset, state?.roundStartAtMs, elapsedMs]);

  const translateForIndex = useCallback((cellIndex, width) => {
    const w = width || reelWidth;
    const center = w / 2;
    return center - (cellIndex * STEP + TILE_W / 2);
  }, [reelWidth]);

  const reelTransformTransition =
    phaseLocal === "rolling" && !skipRollTransition
      ? REEL_SPIN_TRANSITION
      : phaseLocal === "betting" && animateIdleReturn
        ? REEL_SPIN_TRANSITION
        : "none";

  const clearIdleReturnTimer = useCallback(() => {
    if (idleReturnTimeoutRef.current) {
      clearTimeout(idleReturnTimeoutRef.current);
      idleReturnTimeoutRef.current = null;
    }
  }, []);

  const handleStripTransitionEnd = useCallback((e) => {
    if (e.propertyName !== "transform") return;
    setAnimateIdleReturn((v) => {
      if (!v) return v;
      clearIdleReturnTimer();
      return false;
    });
  }, [clearIdleReturnTimer]);

  useEffect(() => () => clearIdleReturnTimer(), [clearIdleReturnTimer]);

  useEffect(() => {
    const rid = state?.roundId;
    if (rid == null) return;
    if (prevRoundIdRef.current != null && prevRoundIdRef.current !== rid) {
      lastAnimatedRoundRef.current = null;
    }
    prevRoundIdRef.current = rid;
  }, [state?.roundId]);

  useEffect(() => {
    if (phaseLocal !== "betting") {
      clearIdleReturnTimer();
      setAnimateIdleReturn(false);
      wasInBettingPhaseRef.current = false;
      lastSeenNonBettingPhaseRef.current = phaseLocal;
      return;
    }

    setSkipRollTransition(false);

    const justEnteredBetting = !wasInBettingPhaseRef.current;
    wasInBettingPhaseRef.current = true;

    const fromPostRoll =
      lastSeenNonBettingPhaseRef.current === "result" ||
      lastSeenNonBettingPhaseRef.current === "closed";

    if (justEnteredBetting && fromPostRoll) {
      setAnimateIdleReturn(true);
      clearIdleReturnTimer();
      idleReturnTimeoutRef.current = setTimeout(() => {
        idleReturnTimeoutRef.current = null;
        setAnimateIdleReturn(false);
      }, REEL_SPIN_DURATION_MS + 120);
    } else {
      setAnimateIdleReturn(false);
    }

    const idleIdx = 5 * SEGMENTS + 7;
    setReelTranslate(translateForIndex(idleIdx, reelWidth));
  }, [phaseLocal, reelWidth, translateForIndex, clearIdleReturnTimer]);

  useEffect(() => {
    const ws = state?.winningSlot;
    const rid = state?.roundId;
    if (ws == null || rid == null) return;
    if (phaseLocal !== "rolling" && phaseLocal !== "result" && phaseLocal !== "closed") return;

    const targetIdx = 11 * SEGMENTS + ws;
    /** Skip spin only if we're clearly past the start of the roll (clock skew / tab background). */
    const joinedLate = elapsedMsRef.current >= BETTING_MS + 1500;
    const alreadyStartedThisRound = lastAnimatedRoundRef.current === rid;

    if (alreadyStartedThisRound) {
      setReelTranslate(translateForIndex(targetIdx, reelWidth));
      return undefined;
    }

    if (joinedLate) {
      lastAnimatedRoundRef.current = rid;
      setSkipRollTransition(true);
      setReelTranslate(translateForIndex(targetIdx, reelWidth));
      return undefined;
    }

    let cancelled = false;
    lastAnimatedRoundRef.current = rid;

    setSkipRollTransition(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setReelTranslate(translateForIndex(targetIdx, reelWidth));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [state?.winningSlot, state?.roundId, phaseLocal, translateForIndex, reelWidth]);

  const mult = state?.multipliers || { red: 2, black: 2, green: 14 };

  const myRoundBets = useMemo(() => {
    const rid = state?.roundId;
    if (!rid) return [];
    return (myHistory || []).filter((h) => String(h?.roundId) === String(rid));
  }, [myHistory, state?.roundId]);

  const hasPlacedRoundBet = myRoundBets.length > 0 || optimisticPlaced;
  const canBet = phaseLocal === "betting";

  const handleBet = async () => {
    try {
      const res = await placeDoubleBet({ amount: Number(amount), side }, dispatch);
      const betId = res?.betId || res?.row?.betId;
      defer(() => {
        setOptimisticPlaced(true);
        const optimisticRow = {
          ...(res?.row || {}),
          betId,
          roundId: res?.roundId ?? state?.roundId,
          side,
          betAmount: res?.betAmount ?? Number(amount),
          amount: res?.betAmount ?? Number(amount),
          userId: res?.row?.userId ?? res?.user?.userId,
          userName: res?.row?.userName ?? res?.user?.altas,
          avatar: res?.row?.avatar ?? res?.user?.avatar,
        };
        setLiveRows((prev) => dedupeLiveRows([optimisticRow, ...(Array.isArray(prev) ? prev : [])]));
        if (betId) recentOwnBetIdsRef.current.set(String(betId), Date.now());
        setMyHistory((prev) => prependMyDoubleBetRow(prev, res));
        const betMsg = `You bet $${roundTo2(res?.betAmount ?? amount).toFixed(2)} on ${String(side).toUpperCase()} in Double round ${res?.roundId ?? state?.roundId ?? ""}`;
        toast.success("Bet placed.");
        dispatch({
          type: "SET_NOTIFICATION",
          payload: buildLocalDoubleNotification(betMsg, myUserId),
        });
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to place bet");
    }
  };

  const halveAmount = () => {
    const v = roundTo2(Number(amount) / 2);
    setAmount(String(Math.max(AMOUNT_MIN, v)));
  };
  const doubleAmount = () => {
    const v = roundTo2(Number(amount) * 2);
    setAmount(String(Math.min(amountMax, Math.max(AMOUNT_MIN, v))));
  };

  const handleAmountFieldChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
      const num = parseFloat(value);
      if (value !== "" && !Number.isNaN(num) && num > amountMax) {
        setAmount(String(amountMax));
      } else {
        setAmount(value);
      }
    }
  };

  const handleAmountFieldBlur = () => {
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num < AMOUNT_MIN) {
      setAmount(AMOUNT_MIN.toFixed(2));
    } else if (num > amountMax) {
      setAmount(roundTo2(amountMax).toFixed(2));
    } else {
      setAmount(roundTo2(num).toFixed(2));
    }
  };

  const strip = useMemo(() => {
    const out = [];
    const bands = 16;
    for (let b = 0; b < bands; b += 1) {
      for (let i = 0; i < SEGMENTS; i += 1) out.push(`${b}-${i}`);
    }
    return out;
  }, []);

  /** Newest on the right; older to the left; up to 10 (server sends newest-first). */
  const recentStrip = useMemo(() => {
    const fromState = Array.isArray(state?.recentResults) ? state.recentResults : [];
    // Render oldest -> newest left-to-right, so newest appears on the right.
    const trimmed = fromState.slice(0, PREVIOUS_ROLLS_COUNT);
    return trimmed.sort((a, b) => Number(a?.roundId ?? 0) - Number(b?.roundId ?? 0));
  }, [state?.recentResults]);

  const usersBySide = useMemo(() => {
    const redMap = new Map();
    const greenMap = new Map();
    const blackMap = new Map();

    for (const r of liveRows || []) {
      const side = String(r.side || "").toLowerCase();
      const userKey = String(r.userId || r.userName || "bot");
      const map = side === "red" ? redMap : side === "green" ? greenMap : side === "black" ? blackMap : null;
      if (!map) continue;

      const prev = map.get(userKey) || {
        ...r,
        amount: 0,
        betAmount: 0,
      };
      const amt = Number(r.amount ?? r.betAmount ?? 0);
      prev.amount = roundTo2(prev.amount + amt);
      prev.betAmount = prev.amount;
      map.set(userKey, prev);
    }

    const sortFn = (a, b) => Number(b.amount || 0) - Number(a.amount || 0);
    return {
      red: Array.from(redMap.values()).sort(sortFn),
      green: Array.from(greenMap.values()).sort(sortFn),
      black: Array.from(blackMap.values()).sort(sortFn),
    };
  }, [liveRows]);

  const redColumnTotal = useMemo(
    () => roundTo2(usersBySide.red.reduce((s, r) => s + Number(r.amount ?? r.betAmount ?? 0), 0)),
    [usersBySide.red]
  );
  const greenColumnTotal = useMemo(
    () => roundTo2(usersBySide.green.reduce((s, r) => s + Number(r.amount ?? r.betAmount ?? 0), 0)),
    [usersBySide.green]
  );
  const blackColumnTotal = useMemo(
    () => roundTo2(usersBySide.black.reduce((s, r) => s + Number(r.amount ?? r.betAmount ?? 0), 0)),
    [usersBySide.black]
  );

  const payoutMult = side === "green" ? mult.green : mult.red;
  const winChancePct = useMemo(() => {
    if (side === "green") return ((1 / SEGMENTS) * 100).toFixed(1);
    return ((7 / SEGMENTS) * 100).toFixed(1);
  }, [side]);

  /** Primary + secondary lines under the timeline ring. */
  const timelineSubtitle = useMemo(() => {
    if (phaseLocal === "syncing") return { line1: "\u00a0", line2: "\u00a0" };
    if (phaseLocal === "betting") {
      const t = Math.max(0, (BETTING_MS - Math.min(BETTING_MS, elapsedMs)) / 1000);
      return { line1: "Place your bets", line2: `Rolling in ${t.toFixed(1)}s` };
    }
    if (phaseLocal === "rolling") {
      const nextRound = Math.max(0, (ROUND_MS - elapsedMs) / 1000);
      return { line1: "Rolling", line2: `Next round in ${nextRound.toFixed(1)}s` };
    }
    if (phaseLocal === "result" || phaseLocal === "closed") {
      const nextRound = Math.max(0, (ROUND_MS - elapsedMs) / 1000);
      return {
        line1: "Next round",
        line2: nextRound > 0.05 ? `Starting in ${nextRound.toFixed(1)}s` : "…",
      };
    }
    return { line1: "", line2: "" };
  }, [phaseLocal, elapsedMs]);

const BetRow = memo(({ r }) => {
  const userKey = String(r.userId || r.userName || "bot");
  const fallbackSrc = doubleLivePfpUrl(userKey);
  const raw = (r.avatar || "").trim();
  const isBot = r.isBot === true;
  const junkAvatar = raw === "undefined" || raw === "null";
  const src = isBot || !raw || junkAvatar ? fallbackSrc : raw;
  const amt = Number(r.amount ?? r.betAmount ?? 0).toFixed(2);

  return (
    <HStack justify="space-between" fontSize="xs" h="28px" w="100%" spacing="8px" sx={{ contain: "content" }}>
      <HStack spacing="8px" minW={0} flex="1">
        <Image
          boxSize="22px"
          borderRadius="full"
          objectFit="cover"
          flexShrink={0}
          src={src}
          alt=""
          bg="whiteAlpha.100"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src !== fallbackSrc) el.src = fallbackSrc;
          }}
        />
        <Text color={C.white} noOfLines={1} fontWeight="600" fontSize="xs">
          {r.userName || "Player"}
        </Text>
      </HStack>
      <Text color={C.cyan} fontWeight="700" flexShrink={0}>
        ${amt}
      </Text>
    </HStack>
  );
}, (prev, next) => {
  return (
    prev.r.userId === next.r.userId &&
    prev.r.userName === next.r.userName &&
    prev.r.amount === next.r.amount &&
    prev.r.avatar === next.r.avatar &&
    prev.r.isBot === next.r.isBot
  );
});

const BetColumn = ({ title, accent, total, rows, emptyHint }) => (
  <Box
    bg={C.panel}
    borderRadius="14px"
    border="1px solid"
    borderColor={C.border}
    overflow="hidden"
    minH="220px"
    h="100%"
    display="flex"
    flexDirection="column"
  >
    <Flex px="14px" pt="12px" pb="8px" align="center" justify="space-between">
      <Text color={C.white} fontWeight="800" fontSize="sm">
        {title}
      </Text>
      <Box w="22px" h="22px" borderRadius="6px" bg={accent} />
    </Flex>
    <Box h="2px" bg={accent} opacity={0.95} />
    <Flex px="14px" py="8px" justify="space-between" fontSize="xs" color={C.muted}>
      <Text>Total Bets</Text>
      <Text fontWeight="700" color={C.white}>
        {roundTo2(total).toFixed(2)}
      </Text>
    </Flex>
    <Box px="10px" pb="10px" flex="1" bg={C.panel}>
      {rows.length === 0 ? (
        <Text color={C.muted} fontSize="xs" textAlign="center" py="6">
          {emptyHint}
        </Text>
      ) : (
        <VStack align="stretch" spacing="4px">
          {rows.map((r) => {
            const userKey = String(r.userId || r.userName || "bot");
            const itemKey = `u:${userKey}-${r.side || "none"}`;
            return <BetRow key={itemKey} r={r} />;
          })}
        </VStack>
      )}
    </Box>
  </Box>
);

  return (
    <Box mt="90px" w="100%" px={{ base: "12px", md: "24px" }} pb="48px">
      <WinFireworksEffect isVisible={showWinFireworks} totalEarn={winFireworksAmount} duration={2200} />
      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(300px, 360px) minmax(0, 1fr)" }}
        gap={{ base: "16px", xl: "24px" }}
        w="100%"
        maxW="1360px"
        mx="auto"
        alignItems="stretch"
      >
        {/* Left: Rubic-style betting controls */}
        <GridItem minW={{ xl: "300px" }} display="flex" flexDirection="column">
          <Card
            pt="30px"
            pb="22px"
            px="22px"
            overflow="visible"
            minH={{ base: "auto", md: "520px", xl: "560px" }}
            position="relative"
            flex="1"
            display="flex"
            flexDirection="column"
          >
            <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" flex="1" minH="0" position="relative">
              <Box position="absolute" top="-30px" right="-20px" zIndex={2}>
                <IconButton
                  aria-label="Help"
                  icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                  size="md"
                  bg="transparent"
                  color={RUBIC_CYAN}
                  borderRadius="50%"
                  _hover={{ bg: "rgba(255,255,255,0.1)", color: RUBIC_CYAN }}
                  onClick={onHelpOpen}
                />
              </Box>

              <VStack spacing="24px" align="center" w="100%">
                <FormControl w="100%" maxW="300px">
                  <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                    Round ID
                  </FormLabel>
                  <GradientBorder borderRadius="20px" w="100%">
                    <Flex
                      w="100%"
                      align="center"
                      justify="space-between"
                      bg={INPUT_INNER_BG}
                      borderRadius="18px"
                      h="46px"
                      px="16px"
                    >
                      <Text color="white" fontSize="xl" fontWeight="bold">
                        {state?.roundId ?? "—"}
                      </Text> 
                    </Flex>
                  </GradientBorder>
                </FormControl>

                <FormControl w="100%" maxW="300px">
                  <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                    Amount
                  </FormLabel>
                  <GradientBorder borderRadius="20px" w="100%">
                    <Flex
                      w="100%"
                      align="center"
                      justify="space-between"
                      bg={INPUT_INNER_BG}
                      borderRadius="18px"
                      h="46px"
                      pl="16px"
                      pr="0"
                    >
                      <Input
                        bg="transparent"
                        border="transparent"
                        fontSize="xl"
                        fontWeight="bold"
                        h="auto"
                        p="0"
                        color="white"
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={handleAmountFieldChange}
                        onBlur={handleAmountFieldBlur}
                        placeholder="0.50"
                        _focus={{ boxShadow: "none" }}
                        flex="1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.target.blur();
                        }}
                      />
                      <HStack spacing="0" align="stretch" h="100%">
                        <Button
                          size="sm"
                          h="100%"
                          minW="36px"
                          px="8px"
                          bg="transparent"
                          color="#fff"
                          fontSize="xs"
                          fontWeight="normal"
                          borderRadius="0"
                          borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                          _hover={{ bg: "rgba(255,255,255,0.1)" }}
                          onClick={halveAmount}
                        >
                          /2
                        </Button>
                        <Button
                          size="sm"
                          h="100%"
                          minW="36px"
                          px="8px"
                          bg="transparent"
                          color="#fff"
                          fontSize="xs"
                          fontWeight="normal"
                          borderRadius="0"
                          borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                          _hover={{ bg: "rgba(255,255,255,0.1)" }}
                          onClick={doubleAmount}
                        >
                          ×2
                        </Button>
                        <Popover placement="bottom-end" closeOnBlur>
                          <PopoverTrigger>
                            <Box
                              borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                              borderTopRightRadius="18px"
                              borderBottomRightRadius="18px"
                              overflow="hidden"
                              cursor="pointer"
                            >
                              <IconButton
                                aria-label="Amount slider"
                                icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                size="xs"
                                h="100%"
                                w="24px"
                                minW="24px"
                                bg="transparent"
                                color="#fff"
                                borderRadius="0"
                                _hover={{ bg: "rgba(255,255,255,0.1)" }}
                              />
                            </Box>
                          </PopoverTrigger>
                          <PopoverContent
                            bg={INPUT_INNER_BG}
                            border="1px solid rgba(255, 255, 255, 0.2)"
                            borderRadius="12px"
                            w="300px"
                            _focus={{ boxShadow: "none" }}
                          >
                            <PopoverBody p="16px">
                              <Flex align="center" gap="12px" w="100%">
                                <Text
                                  color="#fff"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  minW="30px"
                                  cursor="pointer"
                                  onClick={() => setAmount(AMOUNT_MIN.toFixed(2))}
                                >
                                  Min
                                </Text>
                                <Box flex="1">
                                  <Slider
                                    aria-label="Bet amount"
                                    min={AMOUNT_MIN}
                                    max={amountMax}
                                    step={0.01}
                                    value={Math.min(amountMax, Math.max(AMOUNT_MIN, parseFloat(amount) || AMOUNT_MIN))}
                                    onChange={(val) => setAmount(roundTo2(val).toFixed(2))}
                                    focusThumbOnChange={false}
                                  >
                                    <SliderTrack bg={BOX_BG} h="6px" borderRadius="3px">
                                      <SliderFilledTrack bg="transparent" />
                                    </SliderTrack>
                                    <SliderThumb
                                      bg="#fff"
                                      w="12px"
                                      h="24px"
                                      borderRadius="6px"
                                      border="none"
                                      boxShadow="none"
                                      _focus={{ boxShadow: "none" }}
                                    />
                                  </Slider>
                                </Box>
                                <Text
                                  color="#fff"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  minW="36px"
                                  textAlign="right"
                                  cursor="pointer"
                                  onClick={() => setAmount(roundTo2(amountMax).toFixed(2))}
                                >
                                  Max
                                </Text>
                              </Flex>
                            </PopoverBody>
                          </PopoverContent>
                        </Popover>
                      </HStack>
                    </Flex>
                  </GradientBorder>
                </FormControl>

                <FormControl w="100%" maxW="300px">
                  <FormLabel color="rgba(255,255,255,0.55)" fontSize="sm" fontWeight="600" mb="10px" textAlign="left">
                    Select Color
                  </FormLabel>
                  <HStack spacing="10px" w="100%" align="stretch">
                    {[
                      { key: "red", multKey: "red", dot: "fill", fill: C.red },
                      { key: "green", multKey: "green", dot: "fill", fill: C.green },
                      { key: "black", multKey: "black", dot: "fill", fill: C.black },
                    ].map((opt) => {
                      const picked = side === opt.key;
                      const raw = Number(mult[opt.multKey]);
                      const m = Number.isFinite(raw) ? raw : opt.key === "green" ? 14 : 2;
                      const multLabel = Number.isInteger(m) ? String(m) : String(roundTo2(m));
                      const accent =
                        opt.key === "red" ? C.red : opt.key === "green" ? C.green : "rgba(248,250,252,0.85)";
                      const idleBg = "rgba(255,255,255,0.07)";
                      return (
                        <Button
                          key={opt.key}
                          type="button"
                          flex="1"
                          minW="0"
                          h="52px"
                          px="8px"
                          py="0"
                          borderRadius="14px"
                          fontWeight="800"
                          bg={picked ? INPUT_INNER_BG : idleBg}
                          borderWidth="2px"
                          borderStyle="solid"
                          borderColor={picked ? accent : "transparent"}
                          color={picked ? accent : "rgba(248,250,252,0.82)"}
                          boxShadow="none"
                          _hover={{
                            bg: picked ? INPUT_INNER_BG : "rgba(255,255,255,0.1)",
                            borderColor: picked ? accent : "rgba(255,255,255,0.1)",
                          }}
                          _active={{ transform: "scale(0.98)" }}
                          onClick={() => setSide(opt.key)}
                        >
                          <Flex align="center" justify="center" gap="10px" w="100%">
                            {opt.dot === "fill" ? (
                              <Box boxSize="22px" borderRadius="full" bg={opt.fill} flexShrink={0} />
                            ) : (
                              <Box
                                boxSize="22px"
                                borderRadius="full"
                                border="2px solid"
                                borderColor={picked ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.42)"}
                                bg="transparent"
                                flexShrink={0}
                              />
                            )}
                            <Text fontSize="lg" fontWeight="800" letterSpacing="-0.02em">
                              x{multLabel}
                            </Text>
                          </Flex>
                        </Button>
                      );
                    })}
                  </HStack>
                </FormControl>

                <Button
                  h="46px"
                  w="100%"
                  maxW="300px"
                  fontSize="md"
                  fontWeight="bold"
                  borderRadius="20px"
                  bg={RUBIC_CYAN}
                  color="#fff"
                  border={`2px solid ${RUBIC_CYAN}`}
                  _hover={{
                    bg: RUBIC_CYAN,
                    borderColor: RUBIC_CYAN,
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(0, 212, 255, 0.3)",
                  }}
                  _active={{ transform: "translateY(0)" }}
                  isDisabled={!canBet || hasPlacedRoundBet}
                  onClick={handleBet}
                >
                  BET
                </Button>
                <Text fontSize="xs" color="rgba(255,255,255,0.55)" textAlign="center">
                  Min {AMOUNT_MIN} · Max {AMOUNT_MAX_CAP} (or balance) · One bet per round
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Middle: one card — reel + stats + previous rolls (matches reference) */}
        <GridItem display="flex" flexDirection="column">
          <Box
            flex="1"
            minH={{ base: "480px", md: "520px", xl: "560px" }}
            w="100%"
            borderRadius="22px"
            border="1px solid"
            borderColor={C.border}
            bg={C.panel}
            boxShadow="inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.08)"
            display="flex"
            flexDirection="column"
            overflow="hidden"
          >
            <Flex
              h={DOUBLE_STAGE_HEADER_H}
              flexShrink={0}
              align="center"
              justify="center"
              px="16px"
            >
              {phaseLocal === "syncing" ? (
                <Box w="112px" h="112px" flexShrink={0} aria-hidden />
              ) : typeof state?.roundStartAtMs === "number" && clockOffset != null ? (
                <BettingCountdownRing
                  key={`${state.roundId}-${phaseLocal}`}
                  roundStartAtMs={state.roundStartAtMs}
                  clockOffset={clockOffset}
                  segment={
                    phaseLocal === "betting" ? "betting" : phaseLocal === "rolling" ? "rolling" : "result"
                  }
                />
              ) : (
                <Box w="112px" h="112px" flexShrink={0} aria-hidden />
              )}
            </Flex>
            <Flex
              h={DOUBLE_STAGE_SUBTITLE_H}
              flexShrink={0}
              align="center"
              justify="center"
              px="16px"
            >
              <VStack spacing="2px" align="center" w="100%" px="8px">
                <Text color={C.white} fontSize="sm" fontWeight="700" textAlign="center" noOfLines={1} w="100%">
                  {timelineSubtitle.line1}
                </Text>
                <Text color={C.muted} fontSize="xs" textAlign="center" noOfLines={2} w="100%">
                  {timelineSubtitle.line2}
                </Text>
                {(phaseLocal === "result" || phaseLocal === "closed") && state?.winningColor != null && (
                  <Text color={C.muted} fontSize="xs" textAlign="center" noOfLines={1} w="100%" mt="2px">
                    Result: {String(state.winningColor).toUpperCase()} · Slot {state?.winningSlot}
                  </Text>
                )}
              </VStack>
            </Flex>

            <Flex flex="1" align="center" justify="center" minH="160px" px="8px">
              <Box
                ref={reelContainerRef}
                position="relative"
                w="100%"
                maxW="720px"
                mx="auto"
                borderRadius="14px"
                overflow="hidden"
                bg="rgba(0,0,0,0.22)"
                py="24px"
                style={{
                  maskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
                }}
              >
                <Box
                  position="absolute"
                  left="50%"
                  top="10px"
                  bottom="10px"
                  w="2px"
                  bg="white"
                  boxShadow="0 0 14px rgba(255,255,255,0.55)"
                  zIndex={2}
                  transform="translateX(-50%)"
                  pointerEvents="none"
                />
                <Flex
                  w="max-content"
                  onTransitionEnd={handleStripTransitionEnd}
                  style={{
                    transform: `translate3d(${reelTranslate}px, 0, 0)`,
                    transition: reelTransformTransition,
                  }}
                  gap={`${TILE_GAP}px`}
                >
                  {strip.map((k) => (
                    <ReelTile key={k} n={Number(String(k).split("-")[1])} />
                  ))}
                </Flex>
              </Box>
            </Flex>

            <Flex
              px={{ base: "14px", md: "28px" }}
              py="16px"
              borderTop="1px solid"
              borderColor="rgba(255,255,255,0.08)"
              justify="space-around"
              align="center"
              flexWrap="wrap"
              gap="12px"
              flexShrink={0}
            >
              <VStack spacing="4px" align="center">
                <Text fontSize="xs" color={C.muted} fontWeight="600" textTransform="uppercase" letterSpacing="0.06em">
                  Bet Amount
                </Text>
                <Text fontSize="lg" fontWeight="800" color={C.white}>
                  {roundTo2(Number(amount) || 0).toFixed(2)}
                </Text>
              </VStack>
              <VStack spacing="4px" align="center">
                <Text fontSize="xs" color={C.muted} fontWeight="600" textTransform="uppercase" letterSpacing="0.06em">
                  Payout
                </Text>
                <Text fontSize="lg" fontWeight="800" color={C.cyan}>
                  {payoutMult}x
                </Text>
              </VStack>
              <VStack spacing="4px" align="center">
                <Text fontSize="xs" color={C.muted} fontWeight="600" textTransform="uppercase" letterSpacing="0.06em">
                  Win Chance
                </Text>
                <Box bg={RUBIC_CYAN} px="10px" py="4px" borderRadius="8px">
                  <Text fontSize="lg" fontWeight="800" color="#fff">
                    {winChancePct}%
                  </Text>
                </Box>
              </VStack>
            </Flex>

            <Box
              borderTop="1px solid"
              borderColor="rgba(255,255,255,0.08)"
              h={DOUBLE_PREVIOUS_ROLLS_BLOCK_H}
              flexShrink={0}
              pt="12px"
              px="16px"
              pb="12px"
              display="flex"
              flexDirection="column"
              overflow="hidden"
            >
              <Text color={C.muted} fontSize="xs" fontWeight="700" mb="8px" letterSpacing="0.06em" flexShrink={0}>
                PREVIOUS ROLLS
              </Text>
              <Box flex="1" minH="0" w="100%" overflow="hidden">
                {recentStrip.length === 0 ? (
                  <Flex align="center" h="100%" minH={`${PREVIOUS_ROLLS_TILE_SIZE}px`}>
                    <Text color={C.muted} fontSize="xs">
                      No history yet
                    </Text>
                  </Flex>
                ) : (
                  <Flex
                    w={`${PREV_ROLLS_TOTAL_W_PX}px`}
                    ml="auto"
                    gap={`${PREVIOUS_ROLLS_GAP_PX}px`}
                    align="stretch"
                    minH={`${PREVIOUS_ROLLS_TILE_SIZE}px`}
                    h={`${PREVIOUS_ROLLS_TILE_SIZE}px`}
                    justify="flex-start"
                  >
                    {Array.from({ length: PREVIOUS_ROLLS_COUNT }, (_, i) => {
                      const padLeft = PREVIOUS_ROLLS_COUNT - recentStrip.length;
                      const slotSx = {
                        flex: `0 0 ${PREVIOUS_ROLLS_TILE_SIZE}px`,
                        width: `${PREVIOUS_ROLLS_TILE_SIZE}px`,
                        maxWidth: `${PREVIOUS_ROLLS_TILE_SIZE}px`,
                        minWidth: 0,
                        height: `${PREVIOUS_ROLLS_TILE_SIZE}px`,
                        flexShrink: 0,
                      };
                      if (i < padLeft) {
                        return (
                          <Box
                            key={`prev-slot-empty-${i}`}
                            sx={{
                              ...slotSx,
                              clipPath: HEX_CLIP_PATH,
                              WebkitClipPath: HEX_CLIP_PATH, // iOS/Safari
                              overflow: "hidden",
                              transform: "rotate(90deg)",
                              transformOrigin: "50% 50%",
                            }}
                            bg="rgba(255,255,255,0.04)"
                            border="1px solid rgba(255,255,255,0.06)"
                          />
                        );
                      }
                      const r = recentStrip[i - padLeft];
                      return (
                        <Box key={`${r.roundId}-${r.slot}-${i}`} sx={slotSx}>
                          <ReelTile fill n={r.slot} />
                        </Box>
                      );
                    })}
                  </Flex>
                )}
              </Box>
            </Box>
          </Box>
        </GridItem>
      </Grid>

      <Box w="100%" maxW="1360px" mx="auto" mt="22px">
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="14px" w="100%" alignItems="stretch">
          <BetColumn
            title="Win 2X"
            accent={C.red}
            total={redColumnTotal}
            rows={usersBySide.red}
            emptyHint="No bets on red"
          />
          <BetColumn
            title="Win 14X"
            accent={C.green}
            total={greenColumnTotal}
            rows={usersBySide.green}
            emptyHint="No bets on green"
          />
          <BetColumn
            title="Win 2X"
            accent={C.black}
            total={blackColumnTotal}
            rows={usersBySide.black}
            emptyHint="No bets on black"
          />
        </Grid>

        <DoubleBetHistory results={myHistory || []} />
      </Box>
      <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="md" isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.35)">
          <ModalHeader color="white">Double</ModalHeader>
          <ModalCloseButton color="#fff" _hover={{ color: RUBIC_CYAN }} />
          <ModalBody pb="6">
            <VStack align="start" spacing="3">
              <Text color={RUBIC_CYAN} fontWeight="700" fontSize="sm">
                How to play
              </Text>
              <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="1.65">
                1) Enter your amount and choose Red, Green, or Black.
              </Text>
              <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="1.65">
                2) You can place one bet per round during betting phase only.
              </Text>
              <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="1.65">
                3) Payouts: Red x2, Black x2, Green x14.
              </Text>
              <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="1.65">
                4) When rolling/result starts, bets close until the next round.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
