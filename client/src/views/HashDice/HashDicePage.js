import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import {
    Box,
    Grid,
    GridItem,
    FormControl,
    FormLabel,
    Input,
    Button,
    Text,
    Flex,
    VStack,
    HStack,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import GamePillAmountField from 'components/GamePillAmountField/GamePillAmountField';
import GameTargetStyleField from 'components/GameTargetStyleField/GameTargetStyleField';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { FaDice } from 'react-icons/fa';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';


import HashDiceRollers from './HashDiceItem/HashDiceRollers';
import HashDiceMultiplierStrip from './HashDiceItem/HashDiceMultiplierStrip';
import HashDiceLiveResults from './HashDiceItem/HashDiceLiveResults';
import HashDiceBetHistory from './HashDiceItem/HashDiceBetHistory';
import filterBetAmountTyping from 'variables/filterBetAmountTyping';
import filterPayoutTyping from 'variables/filterPayoutTyping';
import ablyClient from '../../ably/ablyClient';
import { hashDiceBet, fetchHashDiceHistory, fetchHashDiceLiveResults } from 'action/HashDiceActions';

import hashdice from 'assets/img/hash/hash.png';

const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 20;
/** Default multiplier on a winning hit (editable in panel). */
const PAYOUT_MULT = 1.97;
/** Chips under the payout field (manual + auto). */
const PAYOUT_QUICK_PRESETS = [1.01, 2, 10, 100];
const PANEL_DEEP = '#25262b';
const MINT_BTN = '#5efcb4';
/** Same as Plinko auto "Number of Bets" field accent. */
const RUBIC_CYAN = '#00D4FF';
const GOLD_SCRIPT = '#ffcc00';
/** Row min height so panel + game + live columns stay aligned. */
const DESKTOP_COL_MIN_H = '600px';
/** Manual vs Auto share the same body height so switching tabs does not resize the panel. */
const PANEL_TAB_CONTENT_MIN_H = { base: '500px', sm: '520px', md: '540px', '1550px': '492px' };
const PANEL_INNER_MAX_W = { base: '100%', sm: '300px' };

const PURPLE = '#c084fc';
const PANEL_MUTED = 'rgba(255,255,255,0.45)';

const WIN_FX_MS = 2200;
const BANG_MS = 1000;
const AUTO_GAP_MS = 400;
/** Failsafe if roller animation never signals completion (e.g. unmount). */
const ROLL_SETTLE_SAFETY_MS = 12000;
/** Same cap as Plinko live ticker. */
const HASH_DICE_LIVE_FEED_MAX = 17;

/** Light sweep across the BIGWIN pill (loops while win banner is visible). */
const bigWinShineSweep = keyframes`
    0% {
        transform: translateX(-140%) skewX(-22deg);
        opacity: 0.15;
    }
    12% {
        opacity: 1;
    }
    35% {
        opacity: 1;
    }
    55% {
        transform: translateX(220%) skewX(-22deg);
        opacity: 0.2;
    }
    100% {
        transform: translateX(220%) skewX(-22deg);
        opacity: 0.15;
    }
`;

/** Soft purple / gold rim pulse on the banner. */
const PANEL_TAB_SLIDE_EASE = [0.22, 1, 0.36, 1];
const PANEL_TAB_SLIDE_DURATION = 0.34;

/** Horizontal slide only (no opacity fade — avoids layout feeling like vertical motion). */
const panelTabContentVariants = {
    enter: { x: '100%', opacity: 1 },
    center: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 1 },
};

const bigWinBannerPulse = keyframes`
    0%,
    100% {
        box-shadow:
            0 0 28px rgba(124, 58, 237, 0.5),
            0 0 52px rgba(250, 204, 21, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        border-color: rgba(250, 204, 21, 0.42);
    }
    50% {
        box-shadow:
            0 0 38px rgba(167, 139, 250, 0.7),
            0 0 72px rgba(250, 215, 120, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.22);
        border-color: rgba(255, 229, 140, 0.75);
    }
`;

function clampBetAmount(n, maxBal) {
    const cap = maxBal > MAX_AMOUNT ? MAX_AMOUNT : Math.max(0, maxBal);
    const x = Number(n);
    if (!Number.isFinite(x)) return MIN_AMOUNT;
    return Math.max(MIN_AMOUNT, Math.min(cap, Math.round(x * 100) / 100));
}

/** Map `/hash-dice/history/me` rows into `HashDiceBetHistory` shape. */
function mapHashHistoryFromServer(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((h, i) => {
        const ts = h.createAt ? new Date(h.createAt).getTime() : Date.now();
        return {
            id: `${ts}-${i}-${h.roll ?? ''}`,
            createAt: ts,
            multiplier: h.isWin ? Number(h.payout) : 0,
            side: h.side === 1 ? 'High' : 'Low',
            betAmount: Number(h.betAmount),
            profit: Number(h.profit),
        };
    });
}

/** Map `GET /hash-dice/results` row → `HashDiceLiveResults` / `DiceRealViewRow` shape. */
function mapHashDiceLiveFeedRow(d) {
    if (!d) return null;
    const winN = Number(d.win);
    const profitN =
        typeof d.profit === 'number' && Number.isFinite(d.profit)
            ? d.profit
            : Number.isFinite(winN) && Number.isFinite(Number(d.betAmount))
              ? Math.round((winN - Number(d.betAmount)) * 100) / 100
              : 0;
    return {
        id: String(d.id),
        altas: d.user || '—',
        avatar: d.avatar,
        bet: Number(d.betAmount),
        win: winN,
        profit: profitN,
        userId: d.userId,
    };
}

/**
 * BC.Game-style hash zones on 0..99,999: Low wins on roll &lt; lowBelow, High on roll &gt; highAbove.
 * Same-count zones with ~2% house trim: zone ≈ round((100k / payout) × 0.98). At ~1.01× this yields
 * ~97% shown chance (e.g. Low &lt; 97010, High &gt; 2989) — not a fixed 50/50 band.
 */
function zoneCountFromPayout(payoutVal) {
    const p = Number(payoutVal);
    if (!Number.isFinite(p) || p < 1.01) {
        return 50000;
    }
    const capped = Math.min(p, 100);
    const raw = Math.round((100000 / capped) * 0.98);
    return Math.max(1, Math.min(99999, raw));
}

function formatChancePercent(payoutVal) {
    const z = zoneCountFromPayout(payoutVal);
    const pct = (z / 100000) * 100;
    return `${pct.toFixed(1)}%`;
}

function hashThresholdsFromPayout(payoutVal) {
    const zone = zoneCountFromPayout(payoutVal);
    return {
        lowBelow: zone,
        highAbove: 99999 - zone,
    };
}

export default function HashDicePage() {
    const dispatch = useDispatch();
    const historyNav = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const displayName = user?.altas || user?.username || user?.name || 'You';
    const userAvatar = user?.avatar;

    const maxAmount = balance > MAX_AMOUNT ? MAX_AMOUNT : Math.max(0, balance);
    const balanceRef = useRef(balance);
    useEffect(() => {
        balanceRef.current = balance;
    }, [balance]);

    const [panelTab, setPanelTab] = useState('manual');
    const [amount, setAmount] = useState(() => MIN_AMOUNT.toFixed(2));
    const [targetTop, setTargetTop] = useState(0);
    const [payoutInput, setPayoutInput] = useState(PAYOUT_MULT.toFixed(2));
    const [rollPhase, setRollPhase] = useState('idle');
    const [rollValue, setRollValue] = useState(0);
    /** Server roll revealed to rollers while `phase === 'spinning'` (drives settle animation). */
    const [spinTarget, setSpinTarget] = useState(null);
    const [betLoading, setBetLoading] = useState(false);
    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [autoBetTarget, setAutoBetTarget] = useState(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [showBigWin, setShowBigWin] = useState(false);
    const [winFx, setWinFx] = useState({ visible: false, totalEarn: '0' });
    const [bangFx, setBangFx] = useState(false);
    const [liveFeed, setLiveFeed] = useState([]);
    const [betHistory, setBetHistory] = useState([]);

    const autoStopRef = useRef(false);
    const rollSettleWaitRef = useRef(null);
    /** Manual bet: clear loading once result is shown (reels done); set from handleBet only. */
    const manualBetLoadingUnlockRef = useRef(null);
    /** Cleared when a new spin starts so a prior round's delayed `idle` cannot stomp the next spin (auto-bet gap is 400ms). */
    const rollIdleTimeoutRef = useRef(null);
    const rollPhaseRef = useRef('idle');
    const pendingLiveRowsRef = useRef([]);
    const myUserIdStrRef = useRef('');

    useEffect(() => {
        rollPhaseRef.current = rollPhase;
    }, [rollPhase]);

    useEffect(() => {
        myUserIdStrRef.current =
            user?.userId != null
                ? String(user.userId)
                : user?._id != null
                  ? String(user._id)
                  : '';
    }, [user?.userId, user?._id]);

    /** Strip: history from API is newest-first; take 25 most recent, reverse to chronological (L→R old→new). */
    const lastStrip = useMemo(
        () =>
            betHistory
                .slice(0, 25)
                .reverse()
                .map((h) => ({
                    id: h.id,
                    multiplier: Number(h.multiplier) || 0,
                })),
        [betHistory]
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [rows, live] = await Promise.all([
                fetchHashDiceHistory(historyNav),
                fetchHashDiceLiveResults(),
            ]);
            if (cancelled) return;
            setBetHistory(mapHashHistoryFromServer(rows));
            const mapped = (Array.isArray(live) ? live : [])
                .map(mapHashDiceLiveFeedRow)
                .filter(Boolean)
                .slice(0, HASH_DICE_LIVE_FEED_MAX);
            setLiveFeed(mapped);
        })();
        return () => {
            cancelled = true;
        };
    }, [historyNav]);

    useEffect(() => {
        if (!ablyClient) return undefined;
        const channel = ablyClient.channels.get('hashDiceLive');
        const onRow = (message) => {
            const d = message?.data;
            if (!d || d.id == null) return;
            const row = mapHashDiceLiveFeedRow(d);
            if (!row) return;
            const mine =
                myUserIdStrRef.current &&
                row.userId != null &&
                String(row.userId) === myUserIdStrRef.current;
            if (mine && rollPhaseRef.current !== 'idle') {
                pendingLiveRowsRef.current.push(row);
                return;
            }
            setLiveFeed((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((r) => String(r.id) === String(row.id))) return list;
                return [row, ...list].slice(0, HASH_DICE_LIVE_FEED_MAX);
            });
        };
        channel.subscribe('HASH_DICE_LIVE_ROW', onRow);
        return () => channel.unsubscribe('HASH_DICE_LIVE_ROW', onRow);
    }, []);

    useEffect(() => {
        if (rollPhase !== 'idle') return;
        const q = pendingLiveRowsRef.current.splice(0);
        if (q.length === 0) return;
        setLiveFeed((prev) => {
            let list = Array.isArray(prev) ? [...prev] : [];
            for (const row of q) {
                if (list.some((r) => String(r.id) === String(row.id))) continue;
                list = [row, ...list];
            }
            return list.slice(0, HASH_DICE_LIVE_FEED_MAX);
        });
    }, [rollPhase]);

    const goPanelTab = (id) => {
        if (isAutoRunning || id === panelTab) return;
        setPanelTab(id);
    };

    const tabBtn = (id, label) => {
        const active = panelTab === id;
        return (
            <Box
                as="button"
                type="button"
                flex="1"
                py={3}
                px={2}
                fontSize="sm"
                fontWeight={active ? '800' : '600'}
                color={active ? '#fff' : PANEL_MUTED}
                borderBottom="2px solid"
                borderColor={active ? MINT_BTN : 'transparent'}
                transition="color 0.15s, border-color 0.15s"
                onClick={() => goPanelTab(id)}
                cursor={isAutoRunning && id !== panelTab ? 'not-allowed' : 'pointer'}
                opacity={isAutoRunning && id !== panelTab ? 0.5 : 1}
            >
                {label}
            </Box>
        );
    };

    const handleAmountChange = (e) => {
        const next = filterBetAmountTyping(e.target.value, maxAmount);
        if (next == null) return;
        setAmount(next.value);
    };

    const handleAmountBlur = () => {
        const n = parseFloat(amount);
        if (!Number.isFinite(n) || n < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(2));
        else setAmount(Math.min(maxAmount, n).toFixed(2));
    };

    const payoutMult = (() => {
        const n = parseFloat(payoutInput);
        return Number.isFinite(n) && n >= 1.01 ? Math.min(n, 100) : PAYOUT_MULT;
    })();

    const { lowBelow, highAbove } = hashThresholdsFromPayout(payoutMult);

    const handlePayoutBlur = () => {
        const n = parseFloat(payoutInput);
        if (!Number.isFinite(n) || n < 1.01) setPayoutInput(PAYOUT_MULT.toFixed(2));
        else setPayoutInput(Math.min(100, n).toFixed(2));
    };

    const handlePayoutChange = (e) => {
        const next = filterPayoutTyping(e.target.value, 100);
        if (next == null) return;
        setPayoutInput(next.value);
    };

    const applyClampedAmount = (n) => {
        setAmount(clampBetAmount(n, balanceRef.current).toFixed(2));
    };

    const commitPayoutNumeric = (n) => {
        const raw = Number(n);
        if (!Number.isFinite(raw)) return;
        const rounded = Math.round(raw * 100) / 100;
        const c = Math.min(100, Math.max(1.01, rounded));
        setPayoutInput(c.toFixed(2));
    };

    const clearWinBang = useCallback(() => {
        setWinFx({ visible: false, totalEarn: '0' });
        setBangFx(false);
    }, []);

    const handleRollAnimationDone = useCallback(() => {
        const r = rollSettleWaitRef.current;
        rollSettleWaitRef.current = null;
        if (typeof r === 'function') r();
    }, []);

    const runRound = useCallback(async () => {
        const bet = parseFloat(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT) return null;
        if (balanceRef.current < bet) {
            toast.warning('Insufficient balance.');
            return null;
        }

        if (rollIdleTimeoutRef.current != null) {
            window.clearTimeout(rollIdleTimeoutRef.current);
            rollIdleTimeoutRef.current = null;
        }

        setSpinTarget(null);
        setRollPhase('spinning');
        clearWinBang();

        const apiRes = await hashDiceBet(
            { amount: bet, payout: payoutMult, side: targetTop },
            dispatch,
            historyNav,
            { skipUserMerge: true }
        );
        if (!apiRes?.success || !apiRes.data) {
            setSpinTarget(null);
            setRollPhase('idle');
            return null;
        }

        const d = apiRes.data;
        const roll = Number(d.roll) || 0;

        const win = Number(d.winAmount) || 0;
        const profitNet = Number(d.profit);
        const multStrip = d.isWin ? Number(d.payout) || 0 : 0;
        const histRowId = d.liveRowId ? String(d.liveRowId) : `${Date.now()}-${roll}`;

        try {
            setSpinTarget(roll);
            await new Promise((resolve) => {
                rollSettleWaitRef.current = resolve;
                window.setTimeout(() => {
                    if (rollSettleWaitRef.current === resolve) {
                        rollSettleWaitRef.current = null;
                        resolve();
                    }
                }, ROLL_SETTLE_SAFETY_MS);
            });

            /** Same paint as final reel frame: reveal + win UI without waiting for deferred React commit. */
            flushSync(() => {
                setRollValue(roll);
                setRollPhase('show');
                setSpinTarget(null);
                const unlockBetLoading = manualBetLoadingUnlockRef.current;
                if (unlockBetLoading) {
                    manualBetLoadingUnlockRef.current = null;
                    unlockBetLoading();
                }
                if (win > 0) {
                    setShowBigWin(true);
                    /** Same gross as server `winAmount` (round4); avoid stake×UI payout if input was stale (0.1×2 → $0.2). */
                    setWinFx({
                        visible: true,
                        totalEarn: win,
                    });
                } else {
                    setBangFx(true);
                }
            });

            if (d.balance != null) {
                dispatch({ type: 'MERGE_USER', payload: { balance: d.balance } });
            }

            if (d.liveRowId) {
                setLiveFeed((prev) => {
                    const list = Array.isArray(prev) ? prev : [];
                    const idStr = String(d.liveRowId);
                    if (list.some((r) => String(r.id) === idStr)) return list;
                    return [
                        {
                            id: idStr,
                            altas: displayName,
                            avatar: userAvatar,
                            bet,
                            win,
                        },
                        ...list,
                    ].slice(0, HASH_DICE_LIVE_FEED_MAX);
                });
            }
            setBetHistory((h) =>
                [
                    {
                        id: histRowId,
                        createAt: Date.now(),
                        multiplier: multStrip,
                        side: targetTop === 0 ? 'Low' : 'High',
                        betAmount: bet,
                        profit: profitNet,
                    },
                    ...h,
                ].slice(0, 500)
            );

            if (win > 0) {
                window.setTimeout(() => {
                    setShowBigWin(false);
                    setWinFx({ visible: false, totalEarn: '0' });
                }, WIN_FX_MS);
            } else {
                window.setTimeout(() => setBangFx(false), BANG_MS);
            }

            rollIdleTimeoutRef.current = window.setTimeout(() => {
                rollIdleTimeoutRef.current = null;
                setRollPhase((p) => (p === 'show' ? 'idle' : p));
            }, 420);
            return { ok: true };
        } catch {
            rollSettleWaitRef.current = null;
            setSpinTarget(null);
            setRollPhase('idle');
            return null;
        }
    }, [
        amount,
        targetTop,
        payoutMult,
        clearWinBang,
        displayName,
        userAvatar,
        dispatch,
        historyNav,
    ]);

    const handleBet = async () => {
        if (rollPhase === 'spinning' || betLoading || isAutoRunning) return;
        const bet = parseFloat(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT) return;
        if (balanceRef.current < bet) return;

        setBetLoading(true);
        manualBetLoadingUnlockRef.current = () => setBetLoading(false);
        try {
            await runRound();
        } finally {
            manualBetLoadingUnlockRef.current = null;
            setBetLoading(false);
        }
    };

    const handleBetRef = useRef(handleBet);
    handleBetRef.current = handleBet;

    useEffect(() => {
        const typingTarget = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
        };

        const onKeyDown = (e) => {
            if (typingTarget(e.target)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const key = e.key.toLowerCase();

            if (key === 'a') {
                if (rollPhase === 'spinning' || isAutoRunning) return;
                e.preventDefault();
                if (e.repeat) return;
                const current = parseFloat(amount) || MIN_AMOUNT;
                setAmount(clampBetAmount(current / 2, balanceRef.current).toFixed(2));
                return;
            }
            if (key === 's') {
                if (rollPhase === 'spinning' || isAutoRunning) return;
                e.preventDefault();
                if (e.repeat) return;
                const current = parseFloat(amount) || MIN_AMOUNT;
                setAmount(clampBetAmount(current * 2, balanceRef.current).toFixed(2));
                return;
            }
            if (e.key === ' ' || e.code === 'Space') {
                if (rollPhase === 'spinning' || betLoading || isAutoRunning) return;
                e.preventDefault();
                if (e.repeat) return;
                void handleBetRef.current();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [amount, rollPhase, betLoading, isAutoRunning]);

    const handleMachineSpin = () => {
        void handleBet();
    };

    const handleStartAuto = async () => {
        if (isAutoRunning) return;
        if (rollPhase === 'spinning' || betLoading) return;
        const bet = parseFloat(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT) {
            toast.warning(`Bet must be at least ${MIN_AMOUNT}.`);
            return;
        }
        if (balanceRef.current < bet) {
            toast.warning('Insufficient balance.');
            return;
        }

        autoStopRef.current = false;
        setIsAutoRunning(true);

        let done = 0;
        const target = autoBetTarget;

        try {
            while (!autoStopRef.current) {
                if (target != null && done >= target) break;
                if (balanceRef.current < bet) {
                    toast.info('Auto bet stopped — insufficient balance.');
                    break;
                }

                const res = await runRound();
                if (!res?.ok) break;

                await new Promise((r) => setTimeout(r, AUTO_GAP_MS));
                done += 1;
            }
        } finally {
            setIsAutoRunning(false);
        }
    };

    const handleStopAuto = () => {
        autoStopRef.current = true;
        setIsAutoRunning(false);
    };

    useEffect(
        () => () => {
            autoStopRef.current = true;
            if (rollIdleTimeoutRef.current != null) {
                window.clearTimeout(rollIdleTimeoutRef.current);
                rollIdleTimeoutRef.current = null;
            }
        },
        []
    );

    /** Lock inputs only while reels spin — not during result / BIGWIN (manual bet clears loading at `show`). */
    const rolling = rollPhase === 'spinning';
    const busy = rolling;

    return (
        <Box
            px={{ base: '12px', sm: '16px', md: '24px' }}
            minH="100vh"
            bg="transparent"
            marginTop="100px"
            w="100%"
            maxW="100%"
            minW={0}
            overflowX="hidden"
        >
            <WinFireworksEffect
                isVisible={winFx.visible}
                totalEarn={winFx.totalEarn}
                earnDecimals={3}
                duration={WIN_FX_MS}
                zIndex={10000}
            />

            <HashDiceMultiplierStrip results={lastStrip} />

            <Grid
                templateAreas={{
                    base: '"panel" "game" "live"',
                    md: '"panel game" "live live"',
                    '1550px': '"panel game live"',
                }}
                templateColumns={{
                    base: 'minmax(0, 1fr)',
                    md: 'minmax(0, 1fr) minmax(0, 1fr)',
                    '1550px': 'minmax(0, 3fr) minmax(0, 6fr) minmax(0, 2fr)',
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'auto',
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
                maxW="100%"
                minW={0}
                alignItems="stretch"
            >
                <GridItem
                    area="panel"
                    minW={0}
                    maxW="100%"
                    display="flex"
                    flexDirection="column"
                    minH={{ base: 'auto', '1550px': DESKTOP_COL_MIN_H }}
                    alignSelf="stretch"
                >
                    <Card
                        pt="0"
                        pb="22px"
                        px="0"
                        overflow="visible"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        position="relative"
                        h="100%"
                        minH="100%"
                        bg={PANEL_DEEP}
                        border="1px solid rgba(255,255,255,0.06)"
                        boxShadow="0 8px 32px rgba(0,0,0,0.45)"
                    >
                        <Flex
                            px={{ base: '14px', md: '22px' }}
                            borderBottom="1px solid rgba(255,255,255,0.06)"
                            bg="#2a2b31"
                            borderTopRadius="inherit"
                            align="center"
                            position="relative"
                        >
                            <Text
                                flex="1"
                                py={3}
                                fontSize="sm"
                                fontWeight="800"
                                color="#fff"
                                letterSpacing="0.04em"
                                display="flex"
                                alignItems="center"
                                gap={2}
                            >
                                <FaDice style={{ color: MINT_BTN, fontSize: '20px' }} />
                                Panel
                            </Text>
                            <IconButton
                                aria-label="Help"
                                icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                size="sm"
                                variant="ghost"
                                color={PURPLE}
                                borderRadius="full"
                                _hover={{ bg: 'rgba(192,132,252,0.15)', color: PURPLE }}
                                onClick={() => setHelpOpen(true)}
                            />
                        </Flex>
                        <Flex
                            px={{ base: '14px', md: '22px' }}
                            borderBottom="1px solid rgba(255,255,255,0.06)"
                            bg={PANEL_DEEP}
                            align="stretch"
                        >
                            {tabBtn('manual', 'Manual')}
                            {tabBtn('auto', 'Auto')}
                        </Flex>
                        <CardBody
                            overflow="visible"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="flex-start"
                            flex="1"
                            minH={0}
                            position="relative"
                            px={{ base: '14px', md: '22px' }}
                            pt="24px"
                        >
                            <Box
                                w="100%"
                                flex="1"
                                minH={PANEL_TAB_CONTENT_MIN_H}
                                overflow="hidden"
                                position="relative"
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {panelTab === 'manual' ? (
                                        <motion.div
                                            key="manual"
                                            layout={false}
                                            variants={panelTabContentVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{
                                                duration: PANEL_TAB_SLIDE_DURATION,
                                                ease: PANEL_TAB_SLIDE_EASE,
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                            }}
                                        >
                                <VStack spacing="20px" align="center" w="100%">
                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                            Amount
                                        </FormLabel>
                                        <GamePillAmountField
                                            value={amount}
                                            onChange={handleAmountChange}
                                            onBlur={handleAmountBlur}
                                            minAmount={MIN_AMOUNT}
                                            maxAmount={maxAmount}
                                            disabled={busy || isAutoRunning}
                                            onApplyAmount={applyClampedAmount}
                                            quickPresets={[1, 5, 10, 20]}
                                        />
                                    </FormControl>

                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <Flex justify="space-between" align="center" mb="8px" w="100%">
                                            <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="0">
                                                Payout
                                            </FormLabel>
                                            <Text fontSize="xs" fontWeight="600" color="rgba(255,255,255,0.45)">
                                                Chance {formatChancePercent(payoutMult)}
                                            </Text>
                                        </Flex>
                                        <GameTargetStyleField
                                            value={payoutInput}
                                            onChange={handlePayoutChange}
                                            onBlur={handlePayoutBlur}
                                            min={1.01}
                                            max={100}
                                            disabled={busy || isAutoRunning}
                                            placeholder={PAYOUT_MULT.toFixed(2)}
                                            suffix="x"
                                            applyNumeric={commitPayoutNumeric}
                                            quickPresets={PAYOUT_QUICK_PRESETS}
                                        />
                                    </FormControl>

                                    <Button
                                        h="52px"
                                        w="100%"
                                        maxW={PANEL_INNER_MAX_W}
                                        fontSize="md"
                                        fontWeight="900"
                                        borderRadius="14px"
                                        bg={MINT_BTN}
                                        color="#0d0d0d"
                                        letterSpacing="0.04em"
                                        border="none"
                                        boxShadow="0 4px 20px rgba(94,252,180,0.35)"
                                        _hover={{
                                            filter: 'brightness(1.05)',
                                            boxShadow: '0 6px 28px rgba(94,252,180,0.45)',
                                        }}
                                        _active={{ transform: 'scale(0.99)' }}
                                        onClick={handleBet}
                                        isDisabled={
                                            busy ||
                                            betLoading ||
                                            isAutoRunning ||
                                            !amount ||
                                            parseFloat(amount) < MIN_AMOUNT ||
                                            balance < parseFloat(amount)
                                        }
                                        isLoading={betLoading}
                                    >
                                        Bet
                                    </Button>
                                    <Text
                                        fontSize="10px"
                                        color="rgba(255,255,255,0.45)"
                                        textAlign="center"
                                        maxW={PANEL_INNER_MAX_W}
                                        lineHeight="1.5"
                                    >
                                        <b>A</b> — halve amount · <b>S</b> — double · <b>Space</b> — bet (not while typing
                                        in a field or during auto bet).
                                    </Text>
                                </VStack>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="auto"
                                            layout={false}
                                            variants={panelTabContentVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{
                                                duration: PANEL_TAB_SLIDE_DURATION,
                                                ease: PANEL_TAB_SLIDE_EASE,
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                            }}
                                        >
                                <VStack spacing="20px" align="stretch" w="100%" maxW={PANEL_INNER_MAX_W} mx="auto">
                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W} mx="auto">
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                            Amount
                                        </FormLabel>
                                        <GamePillAmountField
                                            value={amount}
                                            onChange={handleAmountChange}
                                            onBlur={handleAmountBlur}
                                            minAmount={MIN_AMOUNT}
                                            maxAmount={maxAmount}
                                            disabled={busy || isAutoRunning}
                                            onApplyAmount={applyClampedAmount}
                                            quickPresets={[1, 5, 10, 20]}
                                        />
                                    </FormControl>

                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <Flex justify="space-between" align="center" mb="8px" w="100%">
                                            <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="0">
                                                Payout
                                            </FormLabel>
                                            <Text fontSize="xs" fontWeight="600" color="rgba(255,255,255,0.45)">
                                                Chance {formatChancePercent(payoutMult)}
                                            </Text>
                                        </Flex>
                                        <GameTargetStyleField
                                            value={payoutInput}
                                            onChange={handlePayoutChange}
                                            onBlur={handlePayoutBlur}
                                            min={1.01}
                                            max={100}
                                            disabled={busy || isAutoRunning}
                                            placeholder={PAYOUT_MULT.toFixed(2)}
                                            suffix="x"
                                            applyNumeric={commitPayoutNumeric}
                                            quickPresets={PAYOUT_QUICK_PRESETS}
                                        />
                                    </FormControl>

                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <FormLabel
                                            color="rgba(255,255,255,0.72)"
                                            fontSize="sm"
                                            fontWeight="600"
                                            mb="8px"
                                            textAlign="left"
                                        >
                                            Number of Bets
                                        </FormLabel>
                                        <Flex
                                            align="stretch"
                                            minH="46px"
                                            borderRadius="12px"
                                            border="2px solid"
                                            borderColor={RUBIC_CYAN}
                                            overflow="hidden"
                                            bg="#2a2d2e"
                                            boxShadow="0 0 0 1px rgba(0, 212, 255, 0.2)"
                                        >
                                            <Input
                                                flex="1"
                                                minW={0}
                                                h="46px"
                                                border="none"
                                                borderRadius="0"
                                                bg="transparent"
                                                color="#fff"
                                                fontWeight="800"
                                                fontSize="lg"
                                                px="14px"
                                                value={autoBetTarget == null ? '∞' : String(autoBetTarget)}
                                                onChange={(e) => {
                                                    const v = e.target.value.trim();
                                                    if (v === '' || v === '∞') {
                                                        setAutoBetTarget(null);
                                                        return;
                                                    }
                                                    const digits = v.replace(/[^\d]/g, '');
                                                    if (digits === '') {
                                                        setAutoBetTarget(null);
                                                        return;
                                                    }
                                                    const n = parseInt(digits, 10);
                                                    if (Number.isFinite(n)) {
                                                        setAutoBetTarget(n <= 0 ? null : Math.min(n, 99999));
                                                    }
                                                }}
                                                isDisabled={isAutoRunning}
                                                _focus={{ boxShadow: 'none' }}
                                                _placeholder={{ color: 'rgba(255,255,255,0.35)' }}
                                            />
                                            <HStack spacing={0} flexShrink={0} h="46px" align="stretch">
                                                <Button
                                                    h="100%"
                                                    minW="44px"
                                                    px="10px"
                                                    borderRadius="0"
                                                    bg="#353a3c"
                                                    color="#fff"
                                                    fontWeight="800"
                                                    fontSize="sm"
                                                    borderLeft="1px solid rgba(255,255,255,0.12)"
                                                    _hover={{ bg: '#3d4346' }}
                                                    onClick={() => setAutoBetTarget(null)}
                                                    isDisabled={isAutoRunning}
                                                >
                                                    ∞
                                                </Button>
                                                <Button
                                                    h="100%"
                                                    minW="44px"
                                                    px="10px"
                                                    borderRadius="0"
                                                    bg="#353a3c"
                                                    color="#fff"
                                                    fontWeight="800"
                                                    fontSize="sm"
                                                    borderLeft="1px solid rgba(255,255,255,0.12)"
                                                    _hover={{ bg: '#3d4346' }}
                                                    onClick={() => setAutoBetTarget(10)}
                                                    isDisabled={isAutoRunning}
                                                >
                                                    10
                                                </Button>
                                                <Button
                                                    h="100%"
                                                    minW="44px"
                                                    px="10px"
                                                    borderRadius="0"
                                                    borderTopRightRadius="10px"
                                                    borderBottomRightRadius="10px"
                                                    bg="#353a3c"
                                                    color="#fff"
                                                    fontWeight="800"
                                                    fontSize="sm"
                                                    borderLeft="1px solid rgba(255,255,255,0.12)"
                                                    _hover={{ bg: '#3d4346' }}
                                                    onClick={() => setAutoBetTarget(100)}
                                                    isDisabled={isAutoRunning}
                                                >
                                                    100
                                                </Button>
                                            </HStack>
                                        </Flex>
                                    </FormControl>

                                    <Button
                                        h="48px"
                                        w="100%"
                                        borderRadius="12px"
                                        fontWeight="900"
                                        fontSize="md"
                                        letterSpacing="0.06em"
                                        textTransform="uppercase"
                                        bg={isAutoRunning ? '#7f1d1d' : PURPLE}
                                        color="#fff"
                                        border={
                                            isAutoRunning
                                                ? '2px solid #b91c1c'
                                                : '2px solid rgba(192,132,252,0.6)'
                                        }
                                        boxShadow={
                                            isAutoRunning
                                                ? 'none'
                                                : '0 0 20px rgba(192,132,252,0.25)'
                                        }
                                        _hover={{
                                            filter: isAutoRunning ? undefined : 'brightness(1.06)',
                                        }}
                                        onClick={isAutoRunning ? handleStopAuto : handleStartAuto}
                                        isDisabled={
                                            !isAutoRunning &&
                                            (busy ||
                                                betLoading ||
                                                !amount ||
                                                parseFloat(amount) < MIN_AMOUNT ||
                                                balance < parseFloat(amount))
                                        }
                                    >
                                        {isAutoRunning ? 'Stop Auto Bet' : 'Start Auto Bet'}
                                    </Button>
                                    <Text
                                        fontSize="10px"
                                        color="rgba(255,255,255,0.45)"
                                        textAlign="center"
                                        maxW={PANEL_INNER_MAX_W}
                                        lineHeight="1.5"
                                    >
                                        <b>A</b> — halve amount · <b>S</b> — double · <b>Space</b> — bet (when not typing
                                        in a field; disabled during auto bet).
                                    </Text>
                                </VStack>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Box>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem
                    area="game"
                    minW={0}
                    maxW="100%"
                    display="flex"
                    flexDirection="column"
                    minH={{ base: 'auto', '1550px': DESKTOP_COL_MIN_H }}
                    alignSelf="stretch"
                >
                    <Box
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        w="100%"
                        h="100%"
                        minH="100%"
                        borderRadius="20px"
                        overflow="hidden"
                        position="relative"
                        border="1px solid rgba(255,255,255,0.08)"
                        bg="#18191d"
                    >
                        {/* Graffiti wall */}
                        <Box
                            position="absolute"
                            inset={0}
                            bg="#25262b"
                            backgroundImage={`
                repeating-linear-gradient(
                  -12deg,
                  transparent,
                  transparent 38px,
                  rgba(0,0,0,0.12) 38px,
                  rgba(0,0,0,0.12) 40px
                ),
                radial-gradient(ellipse at 20% 30%, rgba(192,132,252,0.08) 0%, transparent 55%),
                radial-gradient(ellipse at 80% 70%, rgba(57,255,20,0.06) 0%, transparent 50%)
              `}
                        />

                        <Flex
                            position="relative"
                            zIndex={1}
                            flex="1"
                            direction="column"
                            align="center"
                            justify="center"
                            px={{ base: 3, md: 6 }}
                            py={{ base: 6, md: 8 }}
                        >
                            {/* Machine frame */}

                            <Box
                                py={2}
                                px={3}
                                borderRadius="12px"
                                bg={
                                    showBigWin
                                        ? 'linear-gradient(90deg, #5b21b6 0%, #7c3aed 42%, #8b5cf6 72%, #6d28d9 100%)'
                                        : 'linear-gradient(90deg, rgba(45,30,70,0.85) 0%, rgba(30,25,50,0.9) 100%)'
                                }
                                border="1px solid"
                                borderColor={showBigWin ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.08)'}
                                boxShadow={
                                    showBigWin ? undefined : 'inset 0 2px 8px rgba(0,0,0,0.35)'
                                }
                                transition="all 0.35s ease"
                                position="relative"
                                overflow="hidden"
                                sx={
                                    showBigWin
                                        ? {
                                              animation: `${bigWinBannerPulse} 2.2s ease-in-out infinite`,
                                              _after: {
                                                  content: '""',
                                                  position: 'absolute',
                                                  inset: '-40%',
                                                  left: '-50%',
                                                  width: '38%',
                                                  background:
                                                      'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.75) 50%, rgba(255,252,220,0.55) 52%, rgba(255,255,255,0) 62%, transparent 100%)',
                                                  mixBlendMode: 'overlay',
                                                  filter: 'blur(1px)',
                                                  animation: `${bigWinShineSweep} 2.6s ease-in-out infinite`,
                                                  pointerEvents: 'none',
                                              },
                                          }
                                        : undefined
                                }
                            >
                                <Text
                                    position="relative"
                                    zIndex={1}
                                    textAlign="center"
                                    fontSize="sm"
                                    fontWeight="900"
                                    letterSpacing="0.18em"
                                    color={showBigWin ? GOLD_SCRIPT : 'rgba(255,255,255,0.35)'}
                                    sx={
                                        showBigWin
                                            ? {
                                                  textShadow:
                                                      '0 0 14px rgba(250,204,21,0.75), 0 0 28px rgba(255,220,120,0.35)',
                                              }
                                            : undefined
                                    }
                                >
                                    {showBigWin ? '★ ★ ★ BIGWIN ★ ★ ★' : 'GOOD LUCK TO YOU'}
                                </Text>
                            </Box>

                            <Box
                                position="relative"
                                mx="auto"
                                mb={2}
                                w="100%"
                                maxW={{ base: '500px', md: '620px' }}
                            >
                                {/* Shrink-wrap to the img so reel strip % = % of the picture, not the full row. */}
                                <Flex justify="center" w="100%" lineHeight={0}>
                                    <Box
                                        position="relative"
                                        display="inline-block"
                                        maxW="100%"
                                        lineHeight={0}
                                        verticalAlign="top"
                                    >
                                        <Box
                                            as="img"
                                            src={hashdice}
                                            alt="Hashdice machine"
                                            display="block"
                                            h={{ base: '500px', md: '500px' }}
                                            w="auto"
                                            maxW="100%"
                                            objectFit="contain"
                                            borderRadius="16px"
                                        />

                                        {/* 80% of rendered hash image width, centered on the artwork */}
                                        <Box
                                            position="absolute"
                                            left="47%"
                                            top={{ base: '43.5%', md: '42%' }}
                                            w="70%"
                                            maxW="70%"
                                            transform="translate(-50%, -50%)"
                                            pointerEvents="none"
                                            zIndex={2}
                                        >
                                            <HashDiceRollers
                                                phase={rollPhase}
                                                value={rollValue}
                                                spinTarget={spinTarget}
                                                onSettled={handleRollAnimationDone}
                                            />
                                        </Box>
                                    </Box>
                                </Flex>
                            </Box>

                            {/* <Flex
                                mt={6}
                                justify="center"
                                align="center"
                                gap={{ base: 3, md: 5 }}
                                flexWrap="wrap"
                            >
                                <Button
                                    h="48px"
                                    minW="140px"
                                    px={10}
                                    borderRadius="12px"
                                    bg="linear-gradient(180deg, #7bed9f 0%, #5efcb4 45%, #3dd584 100%)"
                                    color="#0d0d0d"
                                    fontWeight="900"
                                    fontSize="sm"
                                    letterSpacing="0.14em"
                                    textTransform="uppercase"
                                    border="1px solid rgba(255,255,255,0.35)"
                                    boxShadow="0 6px 20px rgba(94,252,180,0.35), inset 0 1px 0 rgba(255,255,255,0.5)"
                                    _hover={{
                                        filter: 'brightness(1.06)',
                                        boxShadow: '0 8px 28px rgba(94,252,180,0.45)',
                                    }}
                                    onClick={handleMachineSpin}
                                    isDisabled={
                                        busy ||
                                        betLoading ||
                                        isAutoRunning ||
                                        !amount ||
                                        parseFloat(amount) < MIN_AMOUNT ||
                                        balance < parseFloat(amount)
                                    }
                                    isLoading={betLoading}
                                >
                                    Spin
                                </Button>
                            </Flex> */}

                            <Flex
                                w="100%"
                                maxW="460px"
                                mx="auto"
                                mt={6}
                                p="5px"
                                borderRadius="full"
                                bg="linear-gradient(180deg, #2e3036 0%, #141518 100%)"
                                border="2px solid rgba(255,255,255,0.07)"
                                boxShadow="inset 0 3px 12px rgba(0,0,0,0.55), 0 8px 28px rgba(0,0,0,0.35)"
                            >
                                <Button
                                    type="button"
                                    flex="1"
                                    borderRadius="full"
                                    py={{ base: 3, md: 4 }}
                                    px={2}
                                    fontSize={{ base: '11px', sm: 'xs' }}
                                    fontWeight="800"
                                    lineHeight="1.25"
                                    whiteSpace="normal"
                                    textAlign="center"
                                    bg={targetTop === 0 ? MINT_BTN : 'transparent'}
                                    color={targetTop === 0 ? '#0d0d0d' : 'rgba(255,255,255,0.55)'}
                                    border="none"
                                    boxShadow={targetTop === 0 ? '0 0 20px rgba(94,252,180,0.35)' : 'none'}
                                    _hover={{
                                        bg: targetTop === 0 ? MINT_BTN : 'rgba(255,255,255,0.06)',
                                    }}
                                    onClick={() => setTargetTop(0)}
                                    isDisabled={busy || isAutoRunning}
                                >
                                    Low &lt; {lowBelow}
                                </Button>
                                <Button
                                    type="button"
                                    flex="1"
                                    borderRadius="full"
                                    py={{ base: 3, md: 4 }}
                                    px={2}
                                    fontSize={{ base: '11px', sm: 'xs' }}
                                    fontWeight="800"
                                    lineHeight="1.25"
                                    whiteSpace="normal"
                                    textAlign="center"
                                    bg={targetTop === 1 ? MINT_BTN : 'transparent'}
                                    color={targetTop === 1 ? '#0d0d0d' : 'rgba(255,255,255,0.45)'}
                                    border="none"
                                    boxShadow={targetTop === 1 ? '0 0 20px rgba(94,252,180,0.35)' : 'none'}
                                    _hover={{
                                        bg: targetTop === 1 ? MINT_BTN : 'rgba(255,255,255,0.06)',
                                    }}
                                    onClick={() => setTargetTop(1)}
                                    isDisabled={busy || isAutoRunning}
                                >
                                    High &gt; {highAbove}
                                </Button>
                            </Flex>
                        </Flex>
                    </Box>
                </GridItem>

                <HashDiceLiveResults rows={liveFeed} desktopMinH={DESKTOP_COL_MIN_H} />
            </Grid>

            <HashDiceBetHistory results={betHistory} />

            <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="rgba(0,0,0,0.75)" backdropFilter="blur(6px)" />
                <ModalContent
                    bg="linear-gradient(180deg, #1e1f24 0%, #14151a 100%)"
                    border="1px solid rgba(57,255,20,0.25)"
                    borderRadius="16px"
                >
                    <ModalHeader color="white" fontWeight="800">
                        Hash Dice
                    </ModalHeader>
                    <ModalCloseButton color="white" />
                    <ModalBody pb={6} color="rgba(255,255,255,0.85)">
                        <Text fontSize="sm" lineHeight="1.6" mb={3}>
                            Bets are placed on the server (<b>POST /api/hash-dice/bet</b>). Set <b>Amount</b> and{' '}
                            <b>Payout</b>, pick <b>Low</b> or <b>High</b>, then <b>Bet</b> or <b>Spin</b>. The
                            five-digit roll comes from the server and matches your side and outcome. Your balance is
                            your account balance.
                        </Text>
                        <Text fontSize="sm" lineHeight="1.6" color="rgba(255,255,255,0.65)">
                            Bet history loads from your saved <b>hashHistory</b>. Sign in if you are logged out.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
