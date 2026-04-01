import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Grid,
  GridItem,
  HStack,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import ablyClient from "../../ably/ablyClient";
import TrenballBetHistory from "./TrenballItem/TrenballBetHistory";
import { trenballScrollbarXStrip, trenballScrollbarY, trenballScrollbarYModal } from "./trenballScrollbarStyles";
import {
  getTrenballState,
  getMyTrenballHistory,
  patchMyTrenballHistoryAfterResult,
  placeTrenballBet,
  prependMyTrenballBetRow,
} from "action/TrenballActions";
import { toast } from "react-toastify";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import PersonIcon from "@mui/icons-material/Person";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import truncateToTwo from "variables/truncateToTwo.js";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import { getUserData } from "action/index";

/** BC.Game–style Trenball palette */
const PANEL = "#2a2d2e";
const GRAPH_BG = "#2a2d2e";
const GREEN = "#48bb78";
const RED = "#ed6363";
const ORANGE = "#f6ad55";
const YELLOW = "#ecc94b";
const CRASH = "#fc8181";
const MUTED = "rgba(255,255,255,0.5)";
const WHITE = "#ffffff";
const TAB_LINE = GREEN;
/** Must match server `trenballGame.service.js` (`MULT_A`, `MULT_P`). */
const MULT_A = 0.025;
const MULT_P = 1.3;
/** Neon curve + fill (BC-style crash chart). */
const NEON_LINE = "#32ff7e";
const NEON_FILL_TOP = "rgba(50, 255, 126, 0.42)";
const NEON_FILL_BOT = "rgba(50, 255, 126, 0)";
const CRASH_LINE = "#ff5d73";
const CRASH_FILL_TOP = "rgba(255, 93, 115, 0.34)";
const CRASH_FILL_BOT = "rgba(255, 93, 115, 0)";
/** X-axis starts as 0…10s; grows with run (BC-style). */
const INITIAL_X_WINDOW_SEC = 10;
const MIN_BET_AMOUNT = 0.1;
/** Y-axis top during betting / idle (matches requested 2.00x band). */
const INITIAL_Y_MAX = 2;
/** Expand Y-axis only after this runtime threshold. */
const Y_AXIS_EXPAND_AFTER_SEC = 10;
const Y_AXIS_THRESHOLD_EPS = 1e-3;
const XAxisTailPadSec = 0.65;

function multiplierAtElapsedSec(elapsedSec, target, durationMs) {
  if (target == null || durationMs == null || durationMs <= 0) return 1;
  const M = Number(target);
  if (M <= 1) return 1;
  const sec = Math.max(0, elapsedSec);
  const v = Math.exp(MULT_A * Math.pow(sec, MULT_P));
  return Math.min(M, v);
}

/** Catmull-Rom to cubic Bézier — smooth curve through sampled points. */
function traceSmoothCurve(ctx, pts) {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
    return;
  }
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

const OUTCOME_COLOR = {
  crash: CRASH,
  red: ORANGE,
  green: GREEN,
  moon: YELLOW,
};

const MAX_LIVE_ROWS = 48;

/** Same visual language as `HashDiceItem/HashDiceMultiplierStrip.js`. */
const STRIP_TRACK_BG = "linear-gradient(90deg, #1e1f24 0%, #25262c 50%, #1e1f24 100%)";
const STRIP_NEON_WIN = "#5efcb4";
const STRIP_LOSS_RED = "#f4a62d";
const STRIP_CRASH_RED = "#ff6a73";
const STRIP_MOON_YELLOW = "#d9ef47";
const STRIP_LOSS_BG = "rgba(244,166,45,0.12)";
const STRIP_LOSS_BORDER = "rgba(244,166,45,0.45)";
const STRIP_CRASH_BG = "rgba(255,106,115,0.14)";
const STRIP_CRASH_BORDER = "rgba(255,106,115,0.45)";
const STRIP_WIN_BG = "rgba(57,255,20,0.08)";
const STRIP_WIN_BORDER = "rgba(57,255,20,0.35)";
const STRIP_MOON_BG = "rgba(217,239,71,0.12)";
const STRIP_MOON_BORDER = "rgba(217,239,71,0.45)";

/** Reference-style chip: low multipliers warm/red, high green. */
function multiplierChipColor(m) {
  const x = Number(m);
  if (!Number.isFinite(x) || x <= 1.1) return RED;
  if (x < 2) return ORANGE;
  return GREEN;
}

/** Plain `x1.25` / `x10` text for pill history strip. */
function formatHistoryMult(m) {
  const x = round2(Number(m));
  if (!Number.isFinite(x)) return "0";
  const s = x.toFixed(2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return s;
}

/** Green pills: ≥2x band (green/moon); red pills: crash/red band — matches reference tiles. */
function historyStripVariant(r) {
  const m = round2(Number(r.crashMultiplier));
  if (!Number.isFinite(m)) return "moon";
  if (m <= 1) return "crash"; // 1.00x
  if (m < 2) return "red"; // >1x && <2x
  if (m < 10) return "green"; // >=2x && <10x
  return "moon"; // other cases
}

function historyStripMultLine(r, variant) {
  const oc = String(r.outcome || "").toLowerCase();
  const m = round2(Number(r.crashMultiplier));
  if (variant === "green") {
    const raw = truncateToTwo(Number(r.crashMultiplier) || 0);
    const part = typeof raw === "number" ? String(raw) : raw;
    return `x${part || formatHistoryMult(m)}`;
  }
  if (oc === "crash") {
    return "0.00x";
  }
  const fixed = Number.isFinite(m) ? m.toFixed(2) : "0.00";
  return `${fixed}x`;
}

function truncUserLabel(s, n = 11) {
  const t = String(s || "Player");
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function formatLiveBetAmount(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2).replace(/\.00$/, "")}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2).replace(/\.00$/, "")}k`;
  return n.toFixed(2).replace(/\.00$/, "");
}

/** Matches bet-tile colors so every side shows a glowing dot in live lists. */
function liveSideDotColor(side) {
  const s = String(side || "").toLowerCase();
  if (s === "crash") return "#ff6a73";
  if (s === "red") return "#f4a62d";
  if (s === "green") return "#66ea89";
  if (s === "moon") return "#d9ef47";
  return "rgba(255,255,255,0.35)";
}

function defer(fn) {
  if (typeof queueMicrotask === "function") queueMicrotask(fn);
  else Promise.resolve().then(fn);
}

function round2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function round1(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

function formatBetAmount(v) {
  const n = round1(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function parseMs(d) {
  if (d == null) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

function displayedMultiplierAt(nowMs, s) {
  if (!s) return 1;
  const target = s.crashMultiplier;
  const rs = parseMs(s.runStartedAt);
  const re = parseMs(s.runEndsAt);
  if (target == null || rs == null || re == null) {
    if (s.phase === "result" && target != null) return Number(target);
    return 1;
  }
  if (nowMs <= rs) return 1;
  if (nowMs >= re) return Number(target);
  const M = Number(target);
  if (M <= 1) return 1;
  const elapsedSec = (nowMs - rs) / 1000;
  const v = Math.exp(MULT_A * Math.pow(Math.max(0, elapsedSec), MULT_P));
  return Math.min(v, M);
}

function outcomeBannerText(outcome) {
  if (!outcome) return "TRENBALL";
  const o = String(outcome).toLowerCase();
  if (o === "crash") return "CRASH";
  return `${o.toUpperCase()} WIN`;
}

function formatMultiplierSlots(v) {
  const n = Number(v);
  const safe = Number.isFinite(n) ? n : 1;
  return `${safe.toFixed(2)}x`;
}

/** Same shape as navbar / Gravity — bell list + toast share this text. */
function buildLocalTrenballNotification(message, userId) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    notification: message,
    status: "success",
    from: "Trenball",
    to: userId || "",
    gameType: "trenball",
    unread: true,
    createdAt: new Date().toISOString(),
  };
}

export default function TrenballPage() {
  const dispatch = useDispatch();
  const userInfo = useSelector((st) => st.user?.userInfo);
  const balance = userInfo?.balance ?? 0;
  const trenballHistoryRows = Array.isArray(userInfo?.trenballHistory) ? userInfo.trenballHistory : [];

  const trenballHistoryRef = useRef([]);
  trenballHistoryRef.current = trenballHistoryRows;
  const userIdNotifyRef = useRef("");
  userIdNotifyRef.current = userInfo?.userId || "";

  const [state, setState] = useState(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [liveRows, setLiveRows] = useState([]);
  const [betAmount, setBetAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [showAllLive, setShowAllLive] = useState(false);
  const [hotkeysModalOpen, setHotkeysModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [hotkeysEnabled, setHotkeysEnabled] = useState(false);
  const [showWinFireworks, setShowWinFireworks] = useState(false);
  const [winFireworksAmount, setWinFireworksAmount] = useState(0);
  const winFireworksTimeoutRef = useRef(null);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const stateRef = useRef(null);
  const clockOffsetRef = useRef(0);
  const initializedRef = useRef(false);
  const lastSyncRoundIdRef = useRef(null);
  const lastResultRoundIdRef = useRef(null);
  const recentOwnBetIdsRef = useRef(new Map());
  const historyRequestRef = useRef(null);
  const historyStripScrollRef = useRef(null);
  const yMaxSmoothRef = useRef(null);
  const ringValueHoldRef = useRef(0);
  const crashFxTimerRef = useRef(null);
  const crashFxRoundRef = useRef(null);
  const crashFxStartRef = useRef(0);
  const lastCanvasPhaseRef = useRef("betting");

  stateRef.current = state;
  clockOffsetRef.current = clockOffset;

  const [isCrashFx, setIsCrashFx] = useState(false);

  const fetchMyHistoryOnce = useCallback(() => {
    if (historyRequestRef.current) return historyRequestRef.current;
    historyRequestRef.current = getMyTrenballHistory({ force: true })
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
    let raf = 0;
    const loop = () => {
      setTick((x) => (x + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    return () => {
      if (winFireworksTimeoutRef.current) clearTimeout(winFireworksTimeoutRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    clockOffsetRef.current = clockOffset;
  }, [clockOffset]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const [s, me] = await Promise.all([getTrenballState(), fetchMyHistoryOnce()]);
        if (!mounted) return;
        if (s?.serverNow != null) {
          setClockOffset(Number(s.serverNow) - Date.now());
          if (s.roundId != null) lastSyncRoundIdRef.current = s.roundId;
        }
        setState(s);
        setLiveRows([]);
        dispatch({
          type: "MERGE_USER",
          payload: {
            trenballHistory: Array.isArray(me) ? me.slice(-100) : [],
          },
        });
      } catch {
        toast.error("Failed to load Trenball");
        setClockOffset(0);
      }
    })();

    const channel = ablyClient.channels.get("trenballGame");
    const onState = (msg) => {
      const data = msg?.data;
      if (!data) return;
      const prevRoundId = lastSyncRoundIdRef.current;
      const roundChanged =
        data.roundId != null &&
        (prevRoundId === null || String(data.roundId) !== String(prevRoundId));
      if (data.serverNow && roundChanged) {
        setClockOffset(Number(data.serverNow) - Date.now());
      }
      if (data.roundId != null) lastSyncRoundIdRef.current = data.roundId;
      setState((prev) => ({ ...(prev || {}), ...data }));
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
                    crashTotalBet: data.crashTotalBet ?? prev.crashTotalBet,
                    redTotalBet: data.redTotalBet ?? prev.redTotalBet,
                    greenTotalBet: data.greenTotalBet ?? prev.greenTotalBet,
                    moonTotalBet: data.moonTotalBet ?? prev.moonTotalBet,
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
                crashTotalBet: data.crashTotalBet ?? prev.crashTotalBet,
                redTotalBet: data.redTotalBet ?? prev.redTotalBet,
                greenTotalBet: data.greenTotalBet ?? prev.greenTotalBet,
                moonTotalBet: data.moonTotalBet ?? prev.moonTotalBet,
              }
            : prev
        );
      });
    };
    const onResult = (msg) => {
      const data = msg?.data;
      if (!data?.roundId || !data.outcome) return;
      if (lastResultRoundIdRef.current === data.roundId) return;
      lastResultRoundIdRef.current = data.roundId;
      if (!mounted) return;
      const next = patchMyTrenballHistoryAfterResult(trenballHistoryRef.current, {
        roundId: data.roundId,
        outcome: data.outcome,
        crashMultiplier: data.crashMultiplier,
      });
      dispatch({
        type: "MERGE_USER",
        payload: { trenballHistory: next },
      });
      const row = Array.isArray(next)
        ? next.find((r) => String(r?.roundId) === String(data.roundId))
        : null;
      const winAmt = row ? Number(row.winAmount) : 0;
      if (winAmt > 0) {
        const cm = Number(data.crashMultiplier);
        const cmStr = Number.isFinite(cm) ? cm.toFixed(2) : "0.00";
        const oc = String(data.outcome || "").toLowerCase();
        const winMsg = `Won $${winAmt.toFixed(2)} on ${data.roundId} on ${oc} @ ${cmStr}x`;
        setWinFireworksAmount(winAmt);
        setShowWinFireworks(true);
        if (winFireworksTimeoutRef.current) clearTimeout(winFireworksTimeoutRef.current);
        winFireworksTimeoutRef.current = setTimeout(() => setShowWinFireworks(false), 2600);
        defer(() => {
          toast.success(winMsg);
          dispatch({
            type: "SET_NOTIFICATION",
            payload: buildLocalTrenballNotification(winMsg, userIdNotifyRef.current),
          });
        });
        getUserData(dispatch).catch(() => {});
      }
    };
    channel.subscribe("TRENBALL_STATE", onState);
    channel.subscribe("TRENBALL_NEW_BET", onBet);
    channel.subscribe("TRENBALL_RESULT", onResult);

    const catchUpTimer = setTimeout(async () => {
      try {
        const snap = await getTrenballState();
        if (!mounted || !snap) return;
        if (snap.roundId != null && String(snap.roundId) === String(lastSyncRoundIdRef.current)) {
          if (Array.isArray(snap.liveUsers)) setLiveRows(dedupeLiveRows(snap.liveUsers));
          setState((prev) => ({ ...(prev || {}), ...snap }));
        }
      } catch {
        /* ignore */
      }
    }, 900);

    return () => {
      mounted = false;
      clearTimeout(catchUpTimer);
      channel.unsubscribe("TRENBALL_STATE", onState);
      channel.unsubscribe("TRENBALL_NEW_BET", onBet);
      channel.unsubscribe("TRENBALL_RESULT", onResult);
    };
  }, [dedupeLiveRows, fetchMyHistoryOnce, dispatch]);

  useEffect(() => {
    const phase = state?.phase;
    const rid = state?.roundId;
    if (phase === "result" && rid != null && crashFxRoundRef.current !== String(rid)) {
      crashFxRoundRef.current = String(rid);
      crashFxStartRef.current = Date.now();
      setIsCrashFx(true);
      if (crashFxTimerRef.current) clearTimeout(crashFxTimerRef.current);
      crashFxTimerRef.current = setTimeout(() => setIsCrashFx(false), 520);
    }
    return () => {
      if (crashFxTimerRef.current) clearTimeout(crashFxTimerRef.current);
    };
  }, [state?.phase, state?.roundId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const s = stateRef.current;
    const now = Date.now() + clockOffsetRef.current;
    const phaseRaw = s?.phase || "betting";

    const padL = 48;
    const padR = 20;
    const padT = 24;
    const padB = 40;
    const gw = w - padL - padR;
    const gh = h - padT - padB;
    const baseY = padT + gh;

    const rs = parseMs(s?.runStartedAt);
    const re = parseMs(s?.runEndsAt);
    const phase = phaseRaw === "running" && re != null && now >= re ? "result" : phaseRaw;

    // Trigger crash FX immediately at local crash time (running -> result),
    // without waiting for backend/state phase propagation.
    if (phase === "result" && lastCanvasPhaseRef.current !== "result") {
      crashFxStartRef.current = Date.now();
      setIsCrashFx(true);
      if (crashFxTimerRef.current) clearTimeout(crashFxTimerRef.current);
      crashFxTimerRef.current = setTimeout(() => setIsCrashFx(false), 520);
    }
    lastCanvasPhaseRef.current = phase;
    const target = s?.crashMultiplier;
    const durMs = rs != null && re != null ? Math.max(1, re - rs) : null;
    const durSec = durMs != null ? durMs / 1000 : 12;

    // For canvas drawing: use full precision (no round2) to avoid head-dot jitter.
    let multDraw = 1;
    if (phase === "running" && rs != null && re != null && target != null) {
      const elapsedSecRaw = Math.max(0, (now - rs) / 1000);
      const M = Number(target);
      if (Number.isFinite(M) && M > 1) {
        multDraw = Math.min(M, Math.exp(MULT_A * Math.pow(elapsedSecRaw, MULT_P)));
      }
    } else if (phase === "result" && target != null) {
      const M = Number(target);
      multDraw = Number.isFinite(M) ? M : 1;
    }

    // Chart timeline: during betting stay at 0; during running/result show seconds since run start (0s at flight start).
    let runElapsedSec = 0;
    if (phase === "running" && rs != null && durMs != null) {
      runElapsedSec = Math.max(0, (now - rs) / 1000);
    } else if (phase === "result" && durMs != null && target != null) {
      runElapsedSec = durSec;
    }

    // Keep the first position fixed at 0s. When time exceeds 10s, compress time to fit.
    const tMax = INITIAL_X_WINDOW_SEC;
    const chartTimeSec = phase === "betting" || target == null || durMs == null ? 0 : runElapsedSec;
    const tRange = Math.max(tMax, chartTimeSec);
    const windowStartSec = 0;

    const yMin = 1;
    let yMaxTarget;
    if (phase === "betting" || durMs == null) {
      yMaxTarget = INITIAL_Y_MAX;
    } else if (phase === "running") {
      // Hold Y-axis steady until threshold, then expand naturally with the curve.
      if (runElapsedSec < Y_AXIS_EXPAND_AFTER_SEC - Y_AXIS_THRESHOLD_EPS) {
        yMaxTarget = INITIAL_Y_MAX;
      } else {
        yMaxTarget = Math.max(INITIAL_Y_MAX, multDraw * 1.16);
      }
    } else {
      // Freeze Y-axis at crash moment so point/curve don't drop on result.
      const holdY = yMaxSmoothRef.current;
      if (holdY != null && Number.isFinite(holdY)) {
        yMaxTarget = holdY;
      } else if (durSec < Y_AXIS_EXPAND_AFTER_SEC - Y_AXIS_THRESHOLD_EPS) {
        yMaxTarget = INITIAL_Y_MAX;
      } else {
        yMaxTarget = Math.max(INITIAL_Y_MAX, multDraw, target != null ? target : multDraw);
        yMaxTarget = Math.min(500_000, yMaxTarget * 1.14);
      }
    }

    // Smooth y-axis changes so it doesn't snap when betting starts.
    const prevYMax = yMaxSmoothRef.current;
    const crossedYAxisThreshold =
      phase === "running" &&
      runElapsedSec >= Y_AXIS_EXPAND_AFTER_SEC - Y_AXIS_THRESHOLD_EPS &&
      (prevYMax == null || prevYMax <= INITIAL_Y_MAX + 0.02);
    let yMax;
    if (prevYMax == null || !Number.isFinite(prevYMax)) {
      yMax = yMaxTarget;
    } else if (crossedYAxisThreshold) {
      // Trigger expansion right when point reaches 10s.
      yMax = yMaxTarget;
    } else {
      const alpha = 0.14; // higher = faster, lower = smoother
      yMax = prevYMax + (yMaxTarget - prevYMax) * alpha;
    }
    yMaxSmoothRef.current = yMax;

    const xScale = (tSec) => padL + (tSec / tRange) * gw;
    const yScale = (m) => padT + gh - ((m - yMin) / Math.max(1e-6, yMax - yMin)) * gh;

    const gridH = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridH; i += 1) {
      const my = yMin + (i / gridH) * (yMax - yMin);
      const y = yScale(my);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + gw, y);
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(`${my.toFixed(2)}x`, 6, y + 4);
    }

    const xStep = tRange <= 12 ? 2 : tRange <= 24 ? 4 : Math.ceil(tRange / 6);
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let sec = 0; sec <= tRange + 0.001; sec += xStep) {
      const x = xScale(Math.min(sec, tRange));
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + gh);
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.fillText(`${Math.round(sec)}s`, x, padT + gh + 20);
    }
    ctx.textAlign = "start";

    const samples = 80;
    const pts = [];

    if (phase === "betting" || target == null || durMs == null) {
      // Static baseline during betting.
      for (let i = 0; i <= 24; i += 1) {
        const t = (i / 24) * tRange;
        pts.push({ x: xScale(t), y: yScale(1) });
      }
    } else {
      // Run curve in chart-time seconds (0s at flight start).
      const tDraw = Math.max(runElapsedSec, 1e-4);
      pts.push({ x: xScale(0), y: yScale(1) });
      for (let i = 1; i <= samples; i += 1) {
        const tSec = (i / samples) * tDraw;
        const m = multiplierAtElapsedSec(tSec, target, durMs);
        pts.push({ x: xScale(tSec), y: yScale(m) });
      }
    }

    const headX = xScale(Math.min(tRange, chartTimeSec));
    const headY = yScale(multDraw);

    if (pts.length >= 2 && phase !== "betting") {
      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const isCrashPhase = phase === "result";
      const strokeGrad = ctx.createLinearGradient(firstPt.x, firstPt.y, lastPt.x, lastPt.y);
      if (isCrashPhase) {
        strokeGrad.addColorStop(0, "#ffb3c7");
        strokeGrad.addColorStop(1, "#ff3b5f");
      } else {
        strokeGrad.addColorStop(0, "#9dffb9");
        strokeGrad.addColorStop(1, "#32ff7e");
      }
      const fillGrad = ctx.createLinearGradient(0, padT, 0, baseY);
      if (isCrashPhase) {
        fillGrad.addColorStop(0, "rgba(255, 146, 176, 0.30)");
        fillGrad.addColorStop(1, "rgba(255, 62, 95, 0)");
      } else {
        fillGrad.addColorStop(0, "rgba(80, 255, 148, 0.30)");
        fillGrad.addColorStop(1, "rgba(50, 255, 126, 0)");
      }

      ctx.beginPath();
      traceSmoothCurve(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, baseY);
      ctx.lineTo(pts[0].x, baseY);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      traceSmoothCurve(ctx, pts);
      ctx.strokeStyle = strokeGrad;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = isCrashPhase ? "rgba(255, 79, 116, 0.95)" : "rgba(50, 255, 126, 0.95)";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      traceSmoothCurve(ctx, pts);
      ctx.strokeStyle = strokeGrad;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      // Small animated trail behind the moving point.
      const trailCount = Math.min(12, pts.length);
      for (let i = 0; i < trailCount; i += 1) {
        const p = pts[pts.length - 1 - i];
        const t = 1 - i / trailCount;
        ctx.fillStyle = isCrashPhase
          ? `rgba(255, 102, 134, ${0.22 * t})`
          : `rgba(80, 255, 148, ${0.22 * t})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.2 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = phase === "result" ? "rgba(255,93,115,0.38)" : "rgba(50,255,126,0.25)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }

    const pulse = 0.5 + 0.5 * Math.sin(now / 180);
    const isCrashPhase = phase === "result";
    const tipCore = isCrashPhase ? "#ff4f74" : "#32ff7e";
    ctx.fillStyle = isCrashPhase
      ? `rgba(255, 122, 156, ${0.3 + pulse * 0.28})`
      : `rgba(136, 255, 181, ${0.3 + pulse * 0.28})`;
    ctx.beginPath();
    ctx.arc(headX, headY, 9 + pulse * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tipCore;
    ctx.beginPath();
    ctx.arc(headX, headY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0d1117";
    ctx.beginPath();
    ctx.arc(headX, headY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Crash-point burst effect (rings + sparks) right when the graph crashes.
    if (phase === "result" && isCrashFx) {
      const t = Math.min(1, Math.max(0, (Date.now() - (crashFxStartRef.current || Date.now())) / 520));
      const fade = 1 - t;
      const ringR = 8 + t * 24;
      ctx.save();
      ctx.strokeStyle = `rgba(255,93,115,${0.72 * fade})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(headX, headY, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,160,175,${0.55 * fade})`;
      ctx.beginPath();
      ctx.arc(headX, headY, ringR * 0.66, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 10; i += 1) {
        const a = (Math.PI * 2 * i) / 10 + t * 0.7;
        const d = 10 + t * (26 + (i % 3) * 5);
        const px = headX + Math.cos(a) * d;
        const py = headY + Math.sin(a) * d;
        ctx.fillStyle = `rgba(255,93,115,${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.4 + (1 - t) * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }, [tick, state, clockOffset]);

  const stripChrono = useMemo(() => {
    const r = Array.isArray(state?.recentResults) ? state.recentResults : [];
    return [...r].reverse();
  }, [state?.recentResults]);

  useEffect(() => {
    if (historyStripScrollRef.current && stripChrono.length > 0) {
      const t = window.setTimeout(() => {
        if (historyStripScrollRef.current) {
          historyStripScrollRef.current.scrollLeft = historyStripScrollRef.current.scrollWidth;
        }
      }, 80);
      return () => window.clearTimeout(t);
    }
  }, [stripChrono.length]);

  const phase = state?.phase || "betting";
  const now = Date.now() + clockOffset;
  const displayMult = displayedMultiplierAt(now, state);
  const payouts = state?.payouts || { crash: 49.99, red: 1.96, green: 2, moon: 10 };
  const outcome = state?.outcome;
  /** Crash (1x) bets: dim name + amount once the run is past 1x or the round did not end on crash. */
  const crashBetLiveDim =
    (phase === "running" && displayMult > 1.001) ||
    (phase === "result" && outcome && String(outcome).toLowerCase() !== "crash");
  /** Red (1-2x) bets: dim name + amount once multiplier goes past 2x or the round did not end on red. */
  const redBetLiveDim =
    (phase === "running" && displayMult >= 2.001) ||
    (phase === "result" && outcome && String(outcome).toLowerCase() !== "red");
  const liveBetAmountColor = WHITE;
  const liveRowDimmed = "rgba(255,255,255,0.5)";
  const bannerColor = outcome ? OUTCOME_COLOR[outcome] || GREEN : GREEN;
  const bannerText =
    phase === "result" && outcome ? outcomeBannerText(outcome) : phase === "betting" ? "PLACE BETS" : "FLYING";
  const resultTone =
    outcome === "green"
      ? { bg: "rgba(18, 60, 42, 0.42)", border: "rgba(86, 240, 164, 0.46)", glow: "86,240,164" }
      : outcome === "red" || outcome === "crash"
        ? { bg: "rgba(72, 20, 28, 0.44)", border: "rgba(255, 102, 119, 0.46)", glow: "255,102,119" }
        : { bg: "rgba(66, 56, 20, 0.42)", border: "rgba(250, 204, 86, 0.46)", glow: "250,204,86" };

  // Local deterministic timer (Gravity-style): smooth countdown driven by synced clock + phase endpoints.
  const betEndMs = parseMs(state?.bettingEndsAt);
  const runEndMs = parseMs(state?.runEndsAt);
  const runStartMs = parseMs(state?.runStartedAt);
  const roundEndMs = parseMs(state?.roundEndsAt);

  const phaseTotalSec =
    phase === "betting"
      ? Math.max(1, Number(state?.timers?.bettingSeconds) || 6)
      : phase === "result"
        ? Math.max(1, Number(state?.timers?.resultSeconds) || 4)
        : phase === "running"
          ? Math.max(1, ((runEndMs ?? 0) - (runStartMs ?? 0)) / 1000 || 1)
          : 1;

  const phaseEndMs =
    phase === "betting" ? betEndMs : phase === "running" ? runEndMs : phase === "result" ? roundEndMs : null;
  const timeLeftMsLocal =
    phaseEndMs != null ? Math.max(0, phaseEndMs - now) : Math.max(0, Number(state?.timeLeftMs) || 0);
  const timeLeftSec = timeLeftMsLocal / 1000;
  const statusUnderMultiplier =
    phase === "running" ? "Waiting…" : phase === "betting" ? `Starts in ${Math.ceil(timeLeftSec)}s` : "";

  const ringValueLive = phaseTotalSec > 0 ? ((phaseTotalSec - timeLeftSec) / phaseTotalSec) * 100 : 0;
  if (phase !== "running") {
    ringValueHoldRef.current = ringValueLive;
  }
  const ringValue = phase === "running" ? ringValueHoldRef.current : ringValueLive;

  const placeBet = async (side) => {
    const amt = round1(Number(betAmount));
    if (!Number.isFinite(amt) || amt < MIN_BET_AMOUNT) {
      toast.error("Minimum bet 0.1");
      return;
    }
    if (!userInfo) {
      toast.error("Sign in to play");
      return;
    }
    setBusy(true);
    try {
      const res = await placeTrenballBet({ amount: amt, side }, dispatch);
      const betId = res?.betId ? String(res.betId) : "";
      if (betId) {
        recentOwnBetIdsRef.current.set(betId, Date.now());
        setTimeout(() => recentOwnBetIdsRef.current.delete(betId), 8000);
      }
      dispatch({
        type: "MERGE_USER",
        payload: {
          trenballHistory: prependMyTrenballBetRow(trenballHistoryRef.current, res),
        },
      });
      toast.success(`Bet placed on ${side}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Bet failed");
    } finally {
      setBusy(false);
    }
  };

  const preset = (v) => {
    const n = Math.max(MIN_BET_AMOUNT, round1(Number(v) || 0));
    setBetAmount(formatBetAmount(n));
  };

  const bumpAmount = (delta) => {
    const cur = round1(Number(betAmount) || 0);
    const next = Math.max(MIN_BET_AMOUNT, round1(cur + delta));
    setBetAmount(formatBetAmount(next));
  };

  const betAmountRef = useRef(betAmount);
  betAmountRef.current = betAmount;
  const presetRef = useRef(preset);
  presetRef.current = preset;

  useEffect(() => {
    if (!hotkeysEnabled) return undefined;
    const onKeyDown = (e) => {
      const active = document.activeElement;
      const tag = active?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.repeat) return;

      const amtStr = betAmountRef.current;

      if (e.code === "KeyA" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        const cur = round1(Number(amtStr) || 0);
        presetRef.current(cur / 2);
        return;
      }
      if (e.code === "KeyS" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        const cur = round1(Number(amtStr) || 0);
        presetRef.current(cur * 2);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeysEnabled]);

  const countBySides = (sides) =>
    liveRows.filter((r) => sides.includes(String(r.side || "").toLowerCase())).length;
  const bearPlayers = countBySides(["red", "crash"]);
  const bullPlayers = countBySides(["green", "moon"]);
  const bearVol = round2((state?.redTotalBet || 0) + (state?.crashTotalBet || 0));
  const bullVol = round2((state?.greenTotalBet || 0) + (state?.moonTotalBet || 0));
  const totalVol = Math.max(0.01, bearVol + bullVol);
  const bearPct = (bearVol / totalVol) * 100;
  const bullPct = (bullVol / totalVol) * 100;

  const byAmountDesc = (a, b) => Number(b?.amount || 0) - Number(a?.amount || 0);
  const bearRowsAll = liveRows
    .filter((r) => ["red", "crash"].includes(String(r.side || "").toLowerCase()))
    .sort(byAmountDesc);
  const bullRowsAll = liveRows
    .filter((r) => ["green", "moon"].includes(String(r.side || "").toLowerCase()))
    .sort(byAmountDesc);
  const collapsedPerSideLimit = 6;
  const perSideLimit = showAllLive ? 9999 : collapsedPerSideLimit;
  const bearRows = bearRowsAll.slice(0, perSideLimit);
  const bullRows = bullRowsAll.slice(0, perSideLimit);

  const betTile = (side, label, payout, border, bgTint, hoverBg) => {
    const isBetDisabled = busy || phase !== "betting";
    return (
      <Button
      h="auto"
      py={{ base: 2, md: 2.5 }}
      px={{ base: 1.5, md: 2 }}
      borderRadius="6px"
      bg="#474f57"
      borderWidth="1px"
      borderColor="rgba(255,255,255,0.03)"
      color={WHITE}
      _hover={{
        ...(isBetDisabled
          ? {}
          : {
              color: "#12161c",
              borderColor: border,
              transform: "translateY(-1px) scale(1.01)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
              animation: "trenballBetHoverPulse 680ms ease-in-out infinite alternate",
            }),
      }}
      _disabled={{
        opacity: 0.55,
        cursor: "not-allowed",
        bg: "#474f57",
        color: WHITE,
        borderColor: "rgba(255,255,255,0.03)",
      }}
      isDisabled={isBetDisabled}
      onClick={() => placeBet(side)}
      position="relative"
      overflow="hidden"
      transition="color 0.2s ease, border-color 0.2s ease, transform 0.18s ease, box-shadow 0.18s ease"
      sx={{
        "@keyframes trenballBetHoverPulse": {
          "0%": { filter: "brightness(1)" },
          "100%": { filter: "brightness(1.08)" },
        },
        "@keyframes trenballBetHoverShine": {
          "0%": { transform: "translateX(-170%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" },
        },
        "&::after": isBetDisabled
          ? undefined
          : {
              content: '""',
              position: "absolute",
              top: "-20%",
              left: "-40%",
              width: "34%",
              height: "160%",
              background:
                "linear-gradient(105deg, rgba(255,255,255,0) 25%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 75%)",
              opacity: 0,
              pointerEvents: "none",
            },
        "&::before": isBetDisabled
          ? undefined
          : {
              content: '""',
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "100%",
              background: border,
              transform: "scaleY(0)",
              transformOrigin: "bottom",
              transition: "transform 240ms cubic-bezier(.22,.61,.36,1)",
              zIndex: 0,
              pointerEvents: "none",
            },
        "&:hover::before": isBetDisabled
          ? undefined
          : {
              transform: "scaleY(1)",
            },
        "&:hover::after": isBetDisabled
          ? undefined
          : {
              opacity: 1,
              animation: "trenballBetHoverShine 760ms ease-out",
            },
      }}
    >
      <VStack spacing={{ base: 0.5, md: 1 }} w="100%" position="relative" zIndex={1} align="center">
        <Text fontSize={{ base: "10px", md: "11px" }} color="currentColor" textTransform="none" letterSpacing="0" fontWeight="800" textAlign="center" noOfLines={1}>
          Payout {payout}x
        </Text>
        <HStack spacing={{ base: 1, md: 2 }} justify="center" minW={0}>
          <Box w={{ base: "6px", md: "8px" }} h={{ base: "6px", md: "8px" }} borderRadius="full" bg={border} flexShrink={0} />
          <Text fontWeight="800" fontSize={{ base: "13px", sm: "16px", md: "20px", lg: "24px" }} textTransform="none" letterSpacing="0.01em" color="currentColor" textAlign="center" noOfLines={2} lineHeight="1.15">
            {label}
          </Text>
        </HStack>
      </VStack>
      <Box position="absolute" left={0} right={0} bottom={0} h="4px" bg={border} zIndex={1} pointerEvents="none" />
    </Button>
    );
  };

  const quickBtn = (label, onClick, disabled = false, minW = "unset") => (
    <Button
      h="100%"
      minW={minW}
      px={{ base: "6px", md: "8px" }}
      borderRadius="0"
      bg="transparent"
      borderLeft="1px solid rgba(255, 255, 255, 0.1)"
      color={WHITE}
      fontWeight="normal"
      fontSize={{ base: "xs", md: "sm" }}
      _hover={{ bg: "rgba(255,255,255,0.1)" }}
      onClick={onClick}
      isDisabled={disabled}
    >
      {label}
    </Button>
  );

  const presetBtn = (v, label) => (
    <Button
      key={v}
      size="sm"
      h={{ base: "32px", md: "34px" }}
      px={{ base: 3, md: 5 }}
      borderRadius="8px"
      bg="#3a4148"
      color="rgba(255,255,255,0.45)"
      fontWeight="900"
      fontSize={{ base: "16px", sm: "18px", md: "22px" }}
      _hover={{ bg: "#424a53", color: WHITE }}
      onClick={() => preset(v)}
      flex={{ base: "1 1 calc(50% - 6px)", sm: "1" }}
      minW={{ base: "calc(50% - 6px)", sm: "0" }}
    >
      {label}
    </Button>
  );

  return (
    <Flex
      direction="column"
      w="100%"
      maxW={{ base: "100%", xl: "min(100%, 1680px)" }}
      minW={0}
      mx="auto"
      minH={{ base: "calc(100vh - 72px)", md: "calc(100vh - 120px)" }}
      borderRadius="0"
      overflowX="hidden"
      overflowY="visible"
      mt={{ base: "72px", md: "104px" }}
      mb={{ base: 4, md: 10 }}
      pt={{ base: 3, sm: 5, md: 7 }}
      px={{ base: 3, sm: 4, md: 5 }}
      pb={{ base: 3, md: 6 }}
      boxSizing="border-box"
    >
      <WinFireworksEffect
        isVisible={showWinFireworks}
        totalEarn={winFireworksAmount}
        earnDecimals={2}
        duration={2600}
      />
      <Box mb={{ base: "12px", md: "24px" }} w="100%" minW={0}>
        <Box
          bg={STRIP_TRACK_BG}
          borderRadius={{ base: "10px", md: "14px" }}
          px={{ base: "10px", md: "14px" }}
          py={{ base: "8px", md: "10px" }}
          w="100%"
          minW={0}
          border="1px solid rgba(57,255,20,0.15)"
          boxShadow="0 0 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)"
        >
          {stripChrono.length > 0 ? (
            <Box
              ref={historyStripScrollRef}
              w="100%"
              overflowX="auto"
              overflowY="hidden"
              sx={trenballScrollbarXStrip}
            >
              <Flex wrap="nowrap" gap={{ base: "8px", md: "10px" }} align="center" justifyContent="flex-end">
                {stripChrono.map((r) => {
                  const variant = historyStripVariant(r);
                  const win = variant === "green";
                  const isCrash = variant === "crash";
                  const isMoon = variant === "moon";
                  const chipBg = win ? STRIP_WIN_BG : isCrash ? STRIP_CRASH_BG : STRIP_LOSS_BG;
                  const chipBorder = isMoon
                    ? STRIP_MOON_BORDER
                    : win
                      ? STRIP_WIN_BORDER
                      : isCrash
                        ? STRIP_CRASH_BORDER
                        : STRIP_LOSS_BORDER;
                  const finalChipBg = isMoon ? STRIP_MOON_BG : chipBg;
                  const idColor = win
                    ? "rgba(94,252,180,0.7)"
                    : isMoon
                      ? "rgba(217,239,71,0.82)"
                    : isCrash
                      ? "rgba(255,106,115,0.82)"
                      : "rgba(244,166,45,0.85)";
                  const multColor = isMoon ? STRIP_MOON_YELLOW : win ? STRIP_NEON_WIN : isCrash ? STRIP_CRASH_RED : STRIP_LOSS_RED;
                  const multGlow = win
                    ? "0 0 10px rgba(57,255,20,0.45)"
                    : isMoon
                      ? "0 0 10px rgba(217,239,71,0.5)"
                    : isCrash
                      ? "0 0 10px rgba(255,106,115,0.55)"
                      : "0 0 10px rgba(244,166,45,0.45)";
                  return (
                    <Box
                      key={r.roundId}
                      px="12px"
                      py="6px"
                      borderRadius="8px"
                      bg={finalChipBg}
                      border="1px solid"
                      borderColor={chipBorder}
                      flexShrink={0}
                    >
                      <VStack spacing={0} align="center">
                        <Text
                          fontSize="10px"
                          fontWeight="800"
                          color={idColor}
                          lineHeight="1.2"
                        >
                          #{r.roundId}
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="800"
                          color={multColor}
                          whiteSpace="nowrap"
                          lineHeight="1.25"
                          sx={{
                            textShadow: multGlow,
                          }}
                        >
                          {historyStripMultLine(r, variant)}
                        </Text>
                      </VStack>
                    </Box>
                  );
                })}
              </Flex>
            </Box>
          ) : (
            <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py="6px">
              Round history appears here
            </Text>
          )}
        </Box>
      </Box>

      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) minmax(280px, min(38vw, 420px))" }}
        flex="1"
        w="100%"
        maxW="100%"
        minW={0}
        gap={0}
        alignItems="stretch"
        borderRadius={{ base: "12px", md: "20px" }}
        border="1px solid rgba(255,255,255,0.08)"
        overflow="hidden"
      >
        <GridItem h="100%" minW={0} display="flex" flexDirection="column">
          <VStack align="stretch" spacing={0} h="100%">
            <Box ref={wrapRef} position="relative" h={{ base: "200px", sm: "240px", md: "300px", lg: "320px" }} bg={GRAPH_BG} minH="180px" minW={0}>
              <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
              <Box
                position="absolute"
                inset={0}
                pointerEvents="none"
                sx={{
                  "@keyframes trenballCrashShake": {
                    "0%": { transform: "translate3d(0,0,0)" },
                    "20%": { transform: "translate3d(-4px,2px,0)" },
                    "40%": { transform: "translate3d(4px,-2px,0)" },
                    "60%": { transform: "translate3d(-3px,1px,0)" },
                    "80%": { transform: "translate3d(3px,-1px,0)" },
                    "100%": { transform: "translate3d(0,0,0)" },
                  },
                }}
                style={{ animation: isCrashFx ? "trenballCrashShake 520ms cubic-bezier(.36,.07,.19,.97)" : "none" }}
              />
              <Flex position="absolute" inset={0} align="center" justify="center" pointerEvents="none">
                <VStack spacing={1.5}>
                  <HStack spacing={0} minW={0} maxW="100%" px={1} justify="center" flexWrap="nowrap">
                    {formatMultiplierSlots(displayMult).split("").map((ch, idx) => (
                      <Box
                        key={`${ch}-${idx}`}
                        as="span"
                        display="inline-flex"
                        justifyContent="center"
                        alignItems="center"
                        w={ch === "." ? "0.34em" : ch === "x" ? "0.56em" : "0.62em"}
                        fontSize={{ base: "clamp(28px, 9vw, 44px)", sm: "40px", md: "52px", lg: "56px" }}
                        fontWeight="800"
                        lineHeight="1"
                        color={WHITE}
                      >
                        {ch}
                      </Box>
                    ))}
                  </HStack>
                  <Box minH={{ base: "28px", md: "32px" }} display="flex" alignItems="center" justifyContent="center" px={1}>
                    {phase === "result" ? (
                      <Text
                        fontSize={{ base: "xs", md: "sm" }}
                        fontWeight="900"
                        color={CRASH_LINE}
                        letterSpacing="0.08em"
                        textTransform="uppercase"
                        textShadow="0 0 14px rgba(255,93,115,0.55)"
                      >
                        Crashed
                      </Text>
                    ) : statusUnderMultiplier ? (
                      <Text
                        fontSize={{ base: "xs", md: "sm" }}
                        fontWeight="700"
                        color="rgba(255,255,255,0.72)"
                        px={{ base: 2, md: 3 }}
                        py={1}
                        textAlign="center"
                        noOfLines={2}
                        borderRadius="999px"
                        bg="rgba(0,0,0,0.35)"
                        border="1px solid rgba(255,255,255,0.08)"
                      >
                        {statusUnderMultiplier}
                      </Text>
                    ) : null}
                  </Box>
                </VStack>
              </Flex>
              <HStack position="absolute" bottom={{ base: 2, md: 3 }} right={{ base: 2, md: 4 }} spacing={1}>
                <Box w={2} h={2} borderRadius="full" bg={GREEN} boxShadow={`0 0 6px ${GREEN}`} />
                <Text fontSize="10px" color={MUTED} fontWeight="600" textTransform="uppercase">
                  Live
                </Text>
              </HStack>
            </Box>

            <Box bg={PANEL} px={{ base: 2, sm: 3, md: 5 }} py={{ base: 3, md: 4 }} borderTop="1px solid rgba(255,255,255,0.06)" minW={0}>
              <HStack spacing={{ base: 5, md: 8 }} mb={{ base: 4, md: 5 }} borderBottom="1px solid rgba(255,255,255,0.08)" pb={0} flexWrap="wrap">
                <Box pb={2} borderBottom="2px solid" borderColor={TAB_LINE} mb="-1px">
                  <Text fontSize="sm" fontWeight="800" color={WHITE} textTransform="uppercase" letterSpacing="0.04em">
                    Manual
                  </Text>
                </Box>
                <Text fontSize="sm" fontWeight="600" color={MUTED} textTransform="uppercase" letterSpacing="0.04em" cursor="not-allowed" userSelect="none">
                  Auto
                </Text>
              </HStack>

              <Grid templateColumns={{ base: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }} gap={{ base: 1.5, md: 2 }} mb={4}>
                {betTile("crash", "Bet Crash", payouts.crash, "#ff6a73", "rgba(252,129,129,0.12)", "#4f5862")}
                {betTile("red", "Bet Red", payouts.red, "#f4a62d", "rgba(246,173,85,0.12)", "#4f5862")}
                {betTile("green", "Bet Green", payouts.green, "#66ea89", "rgba(72,187,120,0.12)", "#4f5862")}
                {betTile("moon", "Bet Moon", payouts.moon, "#d9ef47", "rgba(236,201,75,0.12)", "#4f5862")}
              </Grid>

              <Text fontSize={{ base: "xl", sm: "2xl", md: "28px" }} color="#7ef0a5" fontWeight="800" mb={1}>
                Amount
              </Text>

              <HStack spacing={{ base: 1, md: 1.5 }} mb={2} align="stretch" minW={0}>
                <Flex
                  align="center"
                  pl={{ base: "10px", md: "16px" }}
                  bg="#323738"
                  borderRadius={{ base: "14px", md: "18px" }}
                  borderWidth="1px"
                  borderColor="rgba(255,255,255,0.08)"
                  flex="1"
                  minW={0}
                  h={{ base: "44px", md: "46px" }}
                  pr="0"
                  overflow="hidden"
                >
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
                      if (!/^\d*(\.\d?)?$/.test(raw)) return;
                      setBetAmount(raw);
                    }}
                    onBlur={() => {
                      const parsed = Number(betAmount);
                      if (!Number.isFinite(parsed)) {
                        setBetAmount(formatBetAmount(MIN_BET_AMOUNT));
                        return;
                      }
                      const clamped = Math.max(MIN_BET_AMOUNT, round1(parsed));
                      setBetAmount(formatBetAmount(clamped));
                    }}
                    variant="unstyled"
                    color={WHITE}
                    fontWeight="bold"
                    px={0}
                    py={0}
                    fontSize={{ base: "lg", md: "xl" }}
                    h="auto"
                    lineHeight="normal"
                    min={0.1}
                    step={0.1}
                    _focus={{ boxShadow: "none" }}
                    flex="1"
                  />

                  <HStack spacing={0} align="stretch" h="100%" flexShrink={0}>
                    {quickBtn("/2", () => preset(round2(Number(betAmount) / 2)), false, { base: "36px", md: "42px" })}
                    {quickBtn("×2", () => preset(round2(Number(betAmount) * 2)), false, { base: "36px", md: "42px" })}
                    <VStack
                      spacing={0}
                      align="stretch"
                      h="100%"
                      borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                      borderTopRightRadius="18px"
                      borderBottomRightRadius="18px"
                      overflow="hidden"
                    >
                      <IconButton
                        aria-label="increase"
                        size="xs"
                        h="50%"
                        minH="22px"
                        w="24px"
                        minW="24px"
                        borderRadius="0"
                        bg="transparent"
                        color="#fff"
                        icon={<KeyboardArrowUpIcon sx={{ fontSize: 14 }} />}
                        _hover={{ bg: "rgba(255,255,255,0.1)" }}
                        onClick={() => bumpAmount(0.1)}
                      />
                      <IconButton
                        aria-label="decrease"
                        size="xs"
                        h="50%"
                        minH="22px"
                        w="24px"
                        minW="24px"
                        borderRadius="0"
                        bg="transparent"
                        color="#fff"
                        icon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
                        _hover={{ bg: "rgba(255,255,255,0.1)" }}
                        onClick={() => bumpAmount(-0.1)}
                      />
                    </VStack>
                  </HStack>
                </Flex>
              </HStack>

              <HStack spacing={{ base: 1.5, md: 2 }} mb={4} flexWrap="wrap" rowGap={2}>
                {presetBtn(10, "10")}
                {presetBtn(100, "100")}
                {presetBtn(500, "500")}
                {presetBtn(1000, "1.0K")}
              </HStack>

              <HStack spacing={1}>
                <Menu placement="top-start" autoSelect={false}>
                  <Tooltip
                    label="Settings"
                    hasArrow
                    bg="#11161d"
                    color="#fff"
                    fontSize="xs"
                    openDelay={200}
                    closeOnClick={false}
                    shouldWrapChildren
                  >
                    <MenuButton
                      as={IconButton}
                      icon={<SettingsIcon style={{ fontSize: 20, color: MUTED }} />}
                      variant="ghost"
                      size="sm"
                      aria-label="settings"
                    />
                  </Tooltip>
                  <MenuList
                    minW="190px"
                    p={0}
                    bg="#222a31"
                    border="1px solid rgba(255,255,255,0.08)"
                    borderRadius="10px"
                    overflow="hidden"
                    boxShadow="0 12px 36px rgba(0,0,0,0.45)"
                  >
                    <MenuItem
                      icon={<HelpOutlineRoundedIcon fontSize="small" style={{ color: "#fff" }} />}
                      color="#fff"
                      bg="transparent"
                      _hover={{ bg: "rgba(255,255,255,0.06)" }}
                      _focus={{ bg: "rgba(255,255,255,0.06)" }}
                      onClick={() => setHelpModalOpen(true)}
                    >
                      Help
                    </MenuItem>
                    <MenuItem
                      icon={<KeyboardRoundedIcon fontSize="small" style={{ color: "#fff" }} />}
                      color="#fff"
                      bg="transparent"
                      _hover={{ bg: "rgba(255,255,255,0.06)" }}
                      _focus={{ bg: "rgba(255,255,255,0.06)" }}
                      onClick={() => setHotkeysModalOpen(true)}
                    >
                      HotKeys
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            </Box>
          </VStack>
        </GridItem>

        <GridItem
          bg="#2a2d2e"
          borderLeft={{ lg: "1px solid rgba(255,255,255,0.06)" }}
          borderTop={{ base: "1px solid rgba(255,255,255,0.06)", lg: "none" }}
          pt={{ base: 3, md: 4 }}
          px={{ base: 2, sm: 3, md: 4 }}
          pb={0}
          display="flex"
          flexDirection="column"
          h="100%"
          minW={0}
        >
          <Box
            position="relative"
            py={4}
            px={3}
            borderRadius="12px"
            bg="rgba(0,0,0,0.25)"
            mb={4}
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.06)"
          >
            <Text
              position="absolute"
              top={2}
              left={3}
              fontSize="xs"
              fontWeight="700"
              color="rgba(255,255,255,0.72)"
              letterSpacing="0.02em"
            >
              Round #{state?.roundId ?? "—"}
            </Text>
            <Flex justify="center" align="center" minH={{ base: "98px", md: "120px" }}>
              {phase === "running" ? (
                <Text color="#63e486" fontWeight="900" fontSize={{ base: "lg", md: "xl" }} letterSpacing="-0.02em">
                  Waiting…
                </Text>
              ) : (
                <CircularProgress
                  value={ringValue}
                  color={phase === "result" ? bannerColor : "#63e486"}
                  trackColor="rgba(255,255,255,0.16)"
                  thickness="8px"
                  size={{ base: "98px", md: "120px" }}
                >
                  <CircularProgressLabel display="flex" alignItems="center" justifyContent="center" textAlign="center">
                    <VStack spacing="0" lineHeight="1" alignItems="center" justifyContent="center">
                      <Text color={phase === "result" ? bannerColor : "#63e486"} fontWeight="800" fontSize={{ base: "2xl", md: "3xl" }}>
                        {Math.max(0, Math.ceil(timeLeftSec))}
                      </Text>
                      <Text color={phase === "result" ? bannerColor : "#63e486"} fontWeight="700" fontSize={{ base: "10px", md: "11px" }}>
                        Sec
                      </Text>
                    </VStack>
                  </CircularProgressLabel>
                </CircularProgress>
              )}
            </Flex>
          </Box>

          <Box mb={4}>
            <Flex h="10px" borderRadius="full" overflow="hidden" bg="rgba(255,255,255,0.06)" mb={2}>
              <Box w={`${bearPct}%`} bg={ORANGE} transition="width 0.35s ease" />
              <Box w={`${bullPct}%`} bg={GREEN} transition="width 0.35s ease" />
            </Flex>
            <Flex
              justify="space-between"
              align={{ base: "stretch", sm: "center" }}
              flexDirection={{ base: "column", sm: "row" }}
              gap={{ base: 1.5, sm: 0 }}
              fontSize="xs"
              color={MUTED}
              fontWeight="600"
            >
              <Text noOfLines={2}>
                <Text as="span" color={ORANGE}>
                  {bearPlayers}
                </Text>{" "}
                players · ${bearVol.toFixed(2)}
              </Text>
              <Text textAlign={{ base: "left", sm: "right" }} noOfLines={2}>
                <Text as="span" color={GREEN}>
                  {bullPlayers}
                </Text>{" "}
                players · ${bullVol.toFixed(2)}
              </Text>
            </Flex>
          </Box>

          <Flex
            align="center"
            justify="center"
            py={2.5}
            px={2}
            borderRadius="12px"
            bg={phase === "result" ? resultTone.bg : "rgba(0,0,0,0.2)"}
            mb={4}
            borderWidth="1px"
            borderColor={phase === "result" ? resultTone.border : "rgba(255,255,255,0.06)"}
            position="relative"
            overflow="hidden"
            sx={
              phase === "result"
                ? {
                    "@keyframes trenballResultPulse": {
                      "0%, 100%": {
                        boxShadow: `0 0 0 rgba(${resultTone.glow},0.2), inset 0 0 0 rgba(255,255,255,0.02)`,
                        transform: "translateY(0)",
                      },
                      "50%": {
                        boxShadow: `0 0 20px rgba(${resultTone.glow},0.42), inset 0 0 24px rgba(255,255,255,0.04)`,
                        transform: "translateY(-0.5px)",
                      },
                    },
                    "@keyframes trenballResultShine": {
                      "0%": { transform: "translateX(-160%) skewX(-20deg)" },
                      "100%": { transform: "translateX(260%) skewX(-20deg)" },
                    },
                    animation: "trenballResultPulse 2.1s ease-in-out infinite",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      top: "-40%",
                      left: "-65%",
                      width: "38%",
                      height: "180%",
                      background:
                        "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.72) 50%, rgba(255,246,200,0.45) 53%, rgba(255,255,255,0) 62%, transparent 100%)",
                      mixBlendMode: "overlay",
                      filter: "blur(1px)",
                      animation: "trenballResultShine 2.6s ease-in-out infinite",
                      pointerEvents: "none",
                    },
                  }
                : undefined
            }
          >
            <Text
              fontWeight="900"
              fontSize={{ base: "xs", sm: "sm" }}
              color={bannerColor}
              textTransform="uppercase"
              letterSpacing={{
                base: phase === "result" ? "0.12em" : "0.05em",
                sm: phase === "result" ? "0.16em" : "0.06em",
              }}
              position="relative"
              zIndex={1}
              textShadow={phase === "result" ? `0 0 12px rgba(255,255,255,0.24), 0 0 22px rgba(${resultTone.glow},0.35)` : "none"}
            >
              {bannerText}
            </Text>
          </Flex>

          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
            gap={{ base: 3, md: 2.5 }}
            mb={2.5}
          >
            <Box bg="transparent" borderRadius="0" overflow="hidden" borderWidth="0">
              <Flex
                justify="space-between"
                align="center"
                px={2.5}
                py={1.5}
                bg="#2e353d"
                borderBottom="1px solid rgba(255,255,255,0.08)"
                borderTop="3px solid #d89231"
              >
                <HStack spacing={1}>
                  <PersonIcon style={{ fontSize: 14, color: "#ffffff" }} />
                  <Text fontSize="sm" color="#64f0a1" fontWeight="900">{bearPlayers}</Text>
                </HStack>
                <Text fontSize="sm" color="#64f0a1" fontWeight="900">${bearVol.toFixed(2)}</Text>
              </Flex>
              <Flex
                px={2.5}
                py={1.5}
                fontSize="10px"
                color="rgba(255,255,255,0.6)"
                fontWeight="800"
                textTransform="uppercase"
                borderBottom="1px solid rgba(255,255,255,0.08)"
                bg="rgba(0,0,0,0.12)"
              >
                <Text flex="1" noOfLines={1} minW={0}>
                  Player
                </Text>
                <Text w={{ base: "64px", sm: "72px", md: "84px" }} flexShrink={0} textAlign="right">
                  Bet
                </Text>
              </Flex>
              <Box
                h={{ base: "min(40vh, 220px)", md: "min(42vh, 240px)", lg: "252px" }}
                minH="160px"
                overflowY="auto"
                sx={trenballScrollbarY}
              >
                {bearRows.length === 0 ? (
                  <Text color="rgba(255,255,255,0.42)" py={5} textAlign="center" fontSize="sm" fontWeight="700">
                    No bear bets
                  </Text>
                ) : (
                  bearRows.map((r, i) => {
                    const isCrashBet = String(r.side || "").toLowerCase() === "crash";
                    const isRedBet = String(r.side || "").toLowerCase() === "red";
                    const rowMuted = (isCrashBet && crashBetLiveDim) || (isRedBet && redBetLiveDim);
                    const isWinner =
                      phase === "result" &&
                      outcome &&
                      String(outcome).toLowerCase() === String(r.side || "").toLowerCase();
                    const rowTextColor =
                      phase === "result"
                        ? isWinner
                          ? liveBetAmountColor
                          : liveRowDimmed
                        : rowMuted
                          ? liveRowDimmed
                          : liveBetAmountColor;
                    const amountColor = isWinner ? "#66ea89" : rowTextColor;
                    const dotColor = liveSideDotColor(r.side);
                    return (
                    <Flex
                      key={`bear-${r.betId || i}`}
                      align="center"
                      px={2.5}
                      py={2.15}
                      minH="40px"
                      borderBottom="1px solid rgba(255,255,255,0.05)"
                      gap={1.5}
                    >
                      <Box w="8px" display="flex" justifyContent="center" flexShrink={0}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={dotColor}
                          boxShadow={`0 0 8px ${dotColor}66`}
                          opacity={rowMuted ? 0.45 : 1}
                        />
                      </Box>
                      <HStack flex="1" minW={0} spacing={1.5}>
                        <Text minW={0} color={rowTextColor} fontWeight="800" fontSize={{ base: "xs", md: "sm" }} noOfLines={1}>
                          {truncUserLabel(r.userName, 9)}
                        </Text>
                      </HStack>
                      <HStack spacing={1} w={{ base: "64px", sm: "72px", md: "84px" }} flexShrink={0} justify="flex-end">
                        <Text color={amountColor} fontWeight="900" fontSize={{ base: "xs", md: "sm" }} textAlign="right" noOfLines={1}>
                          {formatLiveBetAmount(r.amount)}
                        </Text>
                      </HStack>
                    </Flex>
                    );
                  })
                )}
              </Box>
            </Box>

            <Box bg="transparent" borderRadius="0" overflow="hidden" borderWidth="0">
              <Flex
                justify="space-between"
                align="center"
                px={2.5}
                py={1.5}
                bg="#2e353d"
                borderBottom="1px solid rgba(255,255,255,0.08)"
                borderTop="3px solid #69d582"
              >
                <HStack spacing={1}>
                  <PersonIcon style={{ fontSize: 14, color: "#ffffff" }} />
                  <Text fontSize="sm" color="#64f0a1" fontWeight="900">{bullPlayers}</Text>
                </HStack>
                <Text fontSize="sm" color="#64f0a1" fontWeight="900">${bullVol.toFixed(2)}</Text>
              </Flex>
              <Flex
                px={2.5}
                py={1.5}
                fontSize="10px"
                color="rgba(255,255,255,0.6)"
                fontWeight="800"
                textTransform="uppercase"
                borderBottom="1px solid rgba(255,255,255,0.08)"
                bg="rgba(0,0,0,0.12)"
              >
                <Text flex="1" noOfLines={1} minW={0}>
                  Player
                </Text>
                <Text w={{ base: "64px", sm: "72px", md: "84px" }} flexShrink={0} textAlign="right">
                  Bet
                </Text>
              </Flex>
              <Box
                h={{ base: "min(40vh, 220px)", md: "min(42vh, 240px)", lg: "252px" }}
                minH="160px"
                overflowY="auto"
                sx={trenballScrollbarY}
              >
                {bullRows.length === 0 ? (
                  <Text color="rgba(255,255,255,0.42)" py={5} textAlign="center" fontSize="sm" fontWeight="700">
                    No bull bets
                  </Text>
                ) : (
                  bullRows.map((r, i) => {
                    const isWinner =
                      phase === "result" &&
                      outcome &&
                      String(outcome).toLowerCase() === String(r.side || "").toLowerCase();
                    const rowTextColor =
                      phase === "result" ? (isWinner ? liveBetAmountColor : liveRowDimmed) : liveBetAmountColor;
                    const amountColor = isWinner ? "#66ea89" : rowTextColor;
                    const dotColor = liveSideDotColor(r.side);
                    return (
                    <Flex
                      key={`bull-${r.betId || i}`}
                      align="center"
                      px={2.5}
                      py={2.15}
                      minH="40px"
                      borderBottom="1px solid rgba(255,255,255,0.05)"
                      gap={1.5}
                    >
                      <Box w="8px" display="flex" justifyContent="center" flexShrink={0}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={dotColor}
                          boxShadow={`0 0 8px ${dotColor}66`}
                        />
                      </Box>
                      <HStack flex="1" minW={0} spacing={1.5}>
                        <Text minW={0} color={rowTextColor} fontWeight="800" fontSize={{ base: "xs", md: "sm" }} noOfLines={1}>
                          {truncUserLabel(r.userName, 9)}
                        </Text>
                      </HStack>
                      <HStack spacing={1} w={{ base: "64px", sm: "72px", md: "84px" }} flexShrink={0} justify="flex-end">
                        <Text color={amountColor} fontWeight="900" fontSize={{ base: "xs", md: "sm" }} textAlign="right" noOfLines={1}>
                          {formatLiveBetAmount(r.amount)}
                        </Text>
                      </HStack>
                    </Flex>
                    );
                  })
                )}
              </Box>
            </Box>
          </Grid>

          {(bearRowsAll.length > collapsedPerSideLimit || bullRowsAll.length > collapsedPerSideLimit) ? (
            <Flex justify="center" pt={1} mt="auto">
              <Button
                size="sm"
                h="34px"
                mb="10px"
                px={6}
                borderRadius="10px"
                bg="#4f5760"
                color={WHITE}
                fontWeight="900"
                _hover={{ bg: "#5c6570" }}
                onClick={() => setShowAllLive((v) => !v)}
              >
                {showAllLive ? "Show less" : "Show More"}
              </Button>
            </Flex>
          ) : null}
        </GridItem>
      </Grid>

      <TrenballBetHistory />

      <Modal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} isCentered scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent
          bg="#1a1a1a"
          borderRadius="12px"
          border="1px solid rgba(255,255,255,0.06)"
          maxW={{ base: "100%", sm: "520px" }}
          mx={{ base: 3, md: 4 }}
          my={{ base: 4, md: 8 }}
          boxShadow="0 20px 48px rgba(0,0,0,0.55)"
        >
          <ModalHeader position="relative" pt={4} pb={2} px={4} textAlign="center" color="white" fontWeight="800" fontSize="lg">
            How to play Pulse Crash
            <ModalCloseButton
              position="absolute"
              top={3}
              right={3}
              borderRadius="md"
              bg="rgba(0,0,0,0.35)"
              color="gray.300"
              _hover={{ bg: "rgba(255,255,255,0.08)" }}
            />
          </ModalHeader>
          <ModalBody pb={6} px={4} maxH={{ base: "70vh", md: "65vh" }} overflowY="auto" sx={trenballScrollbarYModal}>
            <VStack align="stretch" spacing={4} color="rgba(255,255,255,0.88)">
              <Box>
                <Text fontWeight="800" color="white" fontSize="sm" mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                  What it is
                </Text>
                <Text fontSize="sm" lineHeight="1.65">
                  Pulse Crash is a crash-style multiplier game. Each round has a hidden crash point. While the round is running, the
                  multiplier climbs on the chart until it stops. Your job is to pick which <Text as="span" fontWeight="700">outcome band</Text>{" "}
                  that final multiplier will fall into—before betting closes.
                </Text>
              </Box>
              <Box>
                <Text fontWeight="800" color="white" fontSize="sm" mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                  Round flow
                </Text>
                <Text fontSize="sm" lineHeight="1.65">
                  <Text as="span" fontWeight="700" color="#63e486">Betting</Text> — choose an amount and a side (Crash, Red, Green, or Moon).
                  You can place <Text as="span" fontWeight="700">one bet per round</Text>.{" "}
                  <Text as="span" fontWeight="700" color="#63e486">Running</Text> — the multiplier moves toward the crash point.{" "}
                  <Text as="span" fontWeight="700" color="#ff6a73">Result</Text> — the final multiplier is revealed; winning bets are paid automatically.
                </Text>
              </Box>
              <Box>
                <Text fontWeight="800" color="white" fontSize="sm" mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                  Outcomes &amp; payouts
                </Text>
                <Text fontSize="sm" lineHeight="1.65" mb={2}>
                  The server picks a final multiplier. Your side wins if it matches that result. Fixed odds (also shown on the bet buttons):
                </Text>
                <VStack align="stretch" spacing={2} fontSize="sm">
                  <Flex justify="space-between" gap={2} bg="#2b2b2b" borderRadius="8px" px={3} py={2} border="1px solid rgba(255,255,255,0.06)">
                    <Text color="#ff6a73" fontWeight="700">
                      Crash
                    </Text>
                    <Text color="rgba(255,255,255,0.75)">Ends at 1.00× or below · {payouts.crash}×</Text>
                  </Flex>
                  <Flex justify="space-between" gap={2} bg="#2b2b2b" borderRadius="8px" px={3} py={2} border="1px solid rgba(255,255,255,0.06)">
                    <Text color="#f4a62d" fontWeight="700">
                      Red
                    </Text>
                    <Text color="rgba(255,255,255,0.75)">Above 1× and below 2× · {payouts.red}×</Text>
                  </Flex>
                  <Flex justify="space-between" gap={2} bg="#2b2b2b" borderRadius="8px" px={3} py={2} border="1px solid rgba(255,255,255,0.06)">
                    <Text color="#66ea89" fontWeight="700">
                      Green
                    </Text>
                    <Text color="rgba(255,255,255,0.75)">2× up to (not including) 10× · {payouts.green}×</Text>
                  </Flex>
                  <Flex justify="space-between" gap={2} bg="#2b2b2b" borderRadius="8px" px={3} py={2} border="1px solid rgba(255,255,255,0.06)">
                    <Text color="#d9ef47" fontWeight="700">
                      Moon
                    </Text>
                    <Text color="rgba(255,255,255,0.75)">10× or higher · {payouts.moon}×</Text>
                  </Flex>
                </VStack>
              </Box>
              <Box>
                <Text fontWeight="800" color="white" fontSize="sm" mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                  Limits &amp; tips
                </Text>
                <Text fontSize="sm" lineHeight="1.65">
                  Minimum bet $0.10 per round (server rules). Watch the timer, confirm your balance, and use{" "}
                  <Text as="span" fontWeight="700">Settings → HotKeys</Text> for keyboard shortcuts when enabled.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={hotkeysModalOpen} onClose={() => setHotkeysModalOpen(false)} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent
          bg="#1a1a1a"
          borderRadius="12px"
          border="1px solid rgba(255,255,255,0.06)"
          maxW="420px"
          mx={{ base: 3, md: 4 }}
          boxShadow="0 20px 48px rgba(0,0,0,0.55)"
        >
          <ModalHeader position="relative" pt={4} pb={3} px={4} textAlign="center" color="white" fontWeight="800" fontSize="lg">
            HotKeys
            <ModalCloseButton
              position="absolute"
              top={3}
              right={3}
              borderRadius="md"
              bg="rgba(0,0,0,0.35)"
              color="gray.300"
              _hover={{ bg: "rgba(255,255,255,0.08)" }}
            />
          </ModalHeader>
          <ModalBody pb={6} px={4}>
            <VStack spacing={2.5} align="stretch">
              {[
                { label: "Half bet amount", keyLabel: "A" },
                { label: "Double bet amount", keyLabel: "S" },
              ].map((row) => (
                <Flex
                  key={row.keyLabel}
                  bg="#2b2b2b"
                  borderRadius="8px"
                  overflow="hidden"
                  align="stretch"
                  minH="46px"
                >
                  <Flex flex="1" align="center" px={3} py={2.5} borderRight="1px solid rgba(255,255,255,0.08)">
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {row.label}
                    </Text>
                  </Flex>
                  <Flex w="88px" flexShrink={0} align="center" justify="center" px={2}>
                    <Text color="white" fontWeight="700" fontSize="sm">
                      {row.keyLabel}
                    </Text>
                  </Flex>
                </Flex>
              ))}
            </VStack>
            <HStack mt={6} spacing={3} align="center">
              <Checkbox
                isChecked={hotkeysEnabled}
                onChange={(e) => setHotkeysEnabled(e.target.checked)}
                colorScheme="gray"
                borderColor="rgba(255,255,255,0.35)"
                sx={{
                  ".chakra-checkbox__control": { borderRadius: "6px", w: "18px", h: "18px" },
                }}
              />
              <Text color="white" fontSize="sm" fontWeight="500">
                Hotkeys Enabled
              </Text>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
