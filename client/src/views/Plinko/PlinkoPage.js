import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
} from '@chakra-ui/react';
import { toast } from 'react-toastify';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import { plinkoBet, fetchPlinkoHistory, fetchPlinkoLiveResults } from 'action/PlinkoActions';
import ablyClient from '../../ably/ablyClient';
import plinko from "assets/img/Plinko/ball.png"

import PlinkoLast from './PlinkoItem/PlinkoLast';
import PlinkoBoard from './PlinkoItem/PlinkoBoard';
import PlinkoBetHistory from './PlinkoItem/PlinkoBetHistory';
import PlinkoLiveResults from './PlinkoItem/PlinkoLiveResults';
import { getPlinkoMultipliers } from './plinkoMultipliers';

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;

/** Desktop (≥1550px): all three columns share this minimum row height and stretch together. */
const PLINKO_DESKTOP_COL_MIN_H = '520px';

/** Bet panel fields fill narrow viewports; cap width from sm up. */
const PANEL_INNER_MAX_W = { base: '100%', sm: '300px' };

const PLINKO_LIVE_FEED_MAX = 13;
/** Aligned with WinFireworksEffect — then hide fireworks, bucket highlight, and ball. */
const PLINKO_WIN_PRESENTATION_MS = 2200;
/** Losing rounds: keep result visible briefly (no fireworks). */
const PLINKO_LOSS_PRESENTATION_MS = 2400;

const RUBIC_CYAN = '#00D4FF';
const PLINKO_GREEN = '#4ade80';
const PANEL_MUTED = 'rgba(255,255,255,0.45)';

function mapServerPlinkoHistoryItem(h) {
    if (!h) return null;
    const ts = h.createAt ? new Date(h.createAt).getTime() : Date.now();
    return {
        ...h,
        id: h.roundId ?? h.id,
        createAt: ts,
    };
}

function clampBetAmount(n, maxBal) {
    const cap = maxBal > MAX_AMOUNT ? MAX_AMOUNT : Math.max(0, maxBal);
    const x = Number(n);
    if (!Number.isFinite(x)) return MIN_AMOUNT;
    return Math.max(MIN_AMOUNT, Math.min(cap, Math.round(x * 100) / 100));
}

export default function PlinkoPage() {
    const dispatch = useDispatch();
    const historyNav = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const displayName = user?.altas || user?.username || user?.name || 'You';
    const avatar = user?.avatar;

    const maxAmount = balance > MAX_AMOUNT ? MAX_AMOUNT : Math.max(0, balance);
    const balanceRef = useRef(balance);
    useEffect(() => {
        balanceRef.current = balance;
    }, [balance]);

    const [panelTab, setPanelTab] = useState('manual');
    const [amount, setAmount] = useState('0.50');
    const [rows, setRows] = useState(16);
    const [history, setHistory] = useState([]);
    const [liveFeed, setLiveFeed] = useState([]);

    const [pathSteps, setPathSteps] = useState(null);
    const [dropTick, setDropTick] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [highlightSlot, setHighlightSlot] = useState(null);
    const [hyperMode, setHyperMode] = useState(false);
    const [betLoading, setBetLoading] = useState(false);
    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [autoBetTarget, setAutoBetTarget] = useState(null);
    const [showWinFireworks, setShowWinFireworks] = useState(false);
    const [winFireworksAmount, setWinFireworksAmount] = useState('0.00');

    const pendingRef = useRef(null);
    const pendingUserMergeRef = useRef(null);
    const roundPresentationTimeoutRef = useRef(null);
    const autoRoundWaitRef = useRef(null);
    const autoStopRequestedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [hist, live] = await Promise.all([
                fetchPlinkoHistory(historyNav),
                fetchPlinkoLiveResults(),
            ]);
            if (cancelled) return;
            if (Array.isArray(hist) && hist.length) {
                setHistory(hist.map(mapServerPlinkoHistoryItem).filter(Boolean));
            }
            if (Array.isArray(live) && live.length) {
                setLiveFeed(live.slice(0, PLINKO_LIVE_FEED_MAX));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [historyNav]);

    useEffect(() => {
        if (!ablyClient) return undefined;
        const channel = ablyClient.channels.get('plinkoLive');
        const onRow = (message) => {
            const d = message?.data;
            if (!d || d.id == null) return;
            const winN = Number(d.win);
            const profitN =
                typeof d.profit === 'number' && Number.isFinite(d.profit)
                    ? d.profit
                    : Number.isFinite(winN) && Number.isFinite(Number(d.betAmount))
                      ? Math.round((winN - Number(d.betAmount)) * 100) / 100
                      : 0;
            const row = {
                id: String(d.id),
                userId: d.userId,
                user: d.user,
                avatar: d.avatar,
                multiplier: d.multiplier,
                win: d.win,
                betAmount: d.betAmount,
                profit: profitN,
            };
            setLiveFeed((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((r) => String(r.id) === row.id)) return list;
                return [row, ...list].slice(0, PLINKO_LIVE_FEED_MAX);
            });
        };
        channel.subscribe('PLINKO_LIVE_ROW', onRow);
        return () => channel.unsubscribe('PLINKO_LIVE_ROW', onRow);
    }, []);

    useEffect(() => {
        return () => {
            if (roundPresentationTimeoutRef.current) clearTimeout(roundPresentationTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        return () => {
            autoStopRequestedRef.current = true;
        };
    }, []);

    const multipliers = useMemo(() => getPlinkoMultipliers(rows, 'regular'), [rows]);

    const lastStrip = useMemo(() => history.slice(-25), [history]);

    const handleAmountChange = (e) => {
        const v = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(v);
    };

    const handleAmountBlur = () => {
        const n = parseFloat(amount);
        if (!Number.isFinite(n) || n < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(2));
        else setAmount(Math.min(maxAmount, n).toFixed(2));
    };

    const setPresetAmount = (v) => {
        const next = clampBetAmount(v, balanceRef.current);
        setAmount(next.toFixed(2));
    };

    const onAnimationDone = useCallback(
        (finalSlot) => {
            const p = pendingRef.current;
            pendingRef.current = null;
            setIsAnimating(false);
            setHighlightSlot(finalSlot);

            if (roundPresentationTimeoutRef.current) {
                clearTimeout(roundPresentationTimeoutRef.current);
                roundPresentationTimeoutRef.current = null;
            }
            const presentationMs =
                p && p.payout > 0 ? PLINKO_WIN_PRESENTATION_MS : PLINKO_LOSS_PRESENTATION_MS;
            roundPresentationTimeoutRef.current = setTimeout(() => {
                roundPresentationTimeoutRef.current = null;
                setShowWinFireworks(false);
                setHighlightSlot(null);
                setPathSteps(null);
            }, presentationMs);

            const mergePayload = pendingUserMergeRef.current;
            if (mergePayload) {
                pendingUserMergeRef.current = null;
                dispatch({
                    type: 'MERGE_USER',
                    payload: mergePayload,
                });
            }

            const wait = autoRoundWaitRef.current;
            if (wait) {
                autoRoundWaitRef.current = null;
                wait.resolve();
            }

            if (!p) return;

            if (p.payout > 0) {
                setWinFireworksAmount(Number(p.payout).toFixed(2));
                setShowWinFireworks(true);
            }

            const row = {
                roundId: p.roundId,
                id: p.roundId,
                multiplier: p.mult,
                slot: finalSlot,
                rows: p.rowCount,
                risk: p.riskKey,
                betAmount: p.bet,
                profit: p.profit,
                createAt: Date.now(),
            };
            setHistory((h) => [...h, row]);
            setLiveFeed((f) =>
                [
                    {
                        id: String(p.roundId),
                        userId: user?.userId,
                        user: displayName,
                        avatar,
                        multiplier: p.mult,
                        win: p.payout,
                        betAmount: p.bet,
                        profit: p.profit,
                    },
                    ...f,
                ].slice(0, PLINKO_LIVE_FEED_MAX)
            );
        },
        [avatar, displayName, dispatch, user?.userId]
    );

    const runPlinkoRoundCore = useCallback(
        async (bet, rowCount, hyper) => {
            const res = await plinkoBet(
                { betAmount: bet, rows: rowCount, hyperMode: hyper },
                dispatch,
                historyNav,
                { skipUserMerge: true }
            );
            if (!res?.data) return null;
            if (res.user) {
                pendingUserMergeRef.current = res.user;
            }

            const {
                pathSteps: steps,
                multiplier: mult,
                profit,
                payout,
                rows: resRows,
                roundId,
                risk: resRisk,
            } = res.data;

            const numMult = Number(mult);
            const numPayout = Number(payout);
            const grossFromBet =
                Number.isFinite(numPayout) && numPayout >= 0
                    ? Math.round(numPayout * 100) / 100
                    : Math.round(bet * numMult * 100) / 100;

            const riskKey = resRisk || 'regular';

            if (roundPresentationTimeoutRef.current) {
                clearTimeout(roundPresentationTimeoutRef.current);
                roundPresentationTimeoutRef.current = null;
            }
            setShowWinFireworks(false);
            setHighlightSlot(null);

            pendingRef.current = {
                mult,
                bet,
                profit,
                payout: grossFromBet,
                rowCount: resRows,
                riskKey,
                roundId,
            };
            setPathSteps(steps);
            setIsAnimating(true);
            setDropTick((x) => x + 1);
            return res;
        },
        [dispatch, historyNav]
    );

    const handleBet = async () => {
        if (isAnimating || betLoading || isAutoRunning) return;
        const bet = parseFloat(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT) return;
        if (balance < bet) return;

        setBetLoading(true);
        try {
            await runPlinkoRoundCore(bet, rows, hyperMode);
        } finally {
            setBetLoading(false);
        }
    };

    const handleStartAuto = async () => {
        if (isAutoRunning) return;
        if (isAnimating || betLoading) return;
        const bet = parseFloat(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT) {
            toast.warning(`Bet must be at least ${MIN_AMOUNT}.`);
            return;
        }
        if (balanceRef.current < bet) {
            toast.warning('Insufficient balance.');
            return;
        }

        setIsAutoRunning(true);
        autoStopRequestedRef.current = false;

        let done = 0;
        const target = autoBetTarget;

        try {
            while (!autoStopRequestedRef.current) {
                if (target != null && done >= target) break;
                if (balanceRef.current < bet) {
                    toast.info('Auto bet stopped — insufficient balance.');
                    break;
                }

                const waitP = new Promise((resolve, reject) => {
                    autoRoundWaitRef.current = { resolve, reject };
                });

                try {
                    const res = await runPlinkoRoundCore(bet, rows, hyperMode);
                    if (!res) {
                        throw new Error('Bet rejected');
                    }
                } catch (e) {
                    autoRoundWaitRef.current = null;
                    toast.error(e?.message || 'Auto bet failed.');
                    break;
                }

                try {
                    await waitP;
                } catch {
                    break;
                }
                done += 1;
            }
        } finally {
            autoRoundWaitRef.current = null;
            setIsAutoRunning(false);
        }
    };

    const handleStopAuto = () => {
        autoStopRequestedRef.current = true;
        const wait = autoRoundWaitRef.current;
        if (wait) {
            autoRoundWaitRef.current = null;
            wait.resolve();
        }
        setIsAutoRunning(false);
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
                borderColor={active ? PLINKO_GREEN : 'transparent'}
                transition="color 0.15s, border-color 0.15s"
                onClick={() => !isAutoRunning && setPanelTab(id)}
                cursor={isAutoRunning && id !== panelTab ? 'not-allowed' : 'pointer'}
                opacity={isAutoRunning && id !== panelTab ? 0.5 : 1}
            >
                {label}
            </Box>
        );
    };

    const presetChip = (label, value) => (
        <Button
            key={label}
            size="sm"
            flex="1"
            minW="0"
            h="36px"
            fontSize="xs"
            fontWeight="700"
            bg="#2a2d2e"
            color="rgba(255,255,255,0.88)"
            borderRadius="8px"
            border="1px solid rgba(255,255,255,0.06)"
            _hover={{ bg: '#35393b' }}
            isDisabled={isAnimating || isAutoRunning}
            onClick={() => setPresetAmount(value)}
        >
            {label}
        </Button>
    );

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
                isVisible={showWinFireworks}
                totalEarn={winFireworksAmount}
                duration={PLINKO_WIN_PRESENTATION_MS}
            />
            <PlinkoLast results={lastStrip} />

            <Grid
                templateAreas={{
                    base: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
                    '1550px': '"panel game empty"',
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
                    minH={{ base: 'auto', '1550px': PLINKO_DESKTOP_COL_MIN_H }}
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
                    >
                        <Flex
                            px={{ base: '14px', md: '22px' }}
                            borderBottom="1px solid rgba(255,255,255,0.08)"
                            bg="#242728"
                            borderTopRadius="inherit"
                            align="stretch"
                        >
                            {tabBtn('manual', 'Manual')}
                            {tabBtn('auto', 'Auto')}
                        </Flex>
                        <CardBody
                            overflow="visible"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flex="1"
                            position="relative"
                            px={{ base: '14px', md: '22px' }}
                            pt="24px"
                        >
                            {panelTab === 'manual' ? (
                                <VStack spacing="24px" align="center" w="100%">
                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                            Amount
                                        </FormLabel>
                                        <GradientBorder borderRadius="20px" w="100%">
                                            <Flex
                                                w="100%"
                                                align="center"
                                                justify="space-between"
                                                bg="#323738"
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
                                                    value={amount}
                                                    onChange={handleAmountChange}
                                                    onBlur={handleAmountBlur}
                                                    _focus={{ boxShadow: 'none' }}
                                                    flex="1"
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
                                                        borderRadius="0"
                                                        borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                        onClick={() => {
                                                            const cur = parseFloat(amount || MIN_AMOUNT);
                                                            setAmount(
                                                                Math.max(
                                                                    MIN_AMOUNT,
                                                                    Math.min(maxAmount, cur / 2)
                                                                ).toFixed(2)
                                                            );
                                                        }}
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
                                                        borderRadius="0"
                                                        borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                        borderTopRightRadius="18px"
                                                        borderBottomRightRadius="18px"
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                        onClick={() => {
                                                            const cur = parseFloat(amount || MIN_AMOUNT);
                                                            setAmount(
                                                                Math.min(maxAmount, cur * 2).toFixed(2)
                                                            );
                                                        }}
                                                    >
                                                        ×2
                                                    </Button>
                                                </HStack>
                                            </Flex>
                                        </GradientBorder>
                                        <HStack spacing="8px" mt="10px" w="100%">
                                            {presetChip('1', 1)}
                                            {presetChip('5', 5)}
                                            {presetChip('10', 10)}
                                            {presetChip('20', 20)}
                                        </HStack>
                                    </FormControl>

                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <FormLabel
                                            color="rgba(255,255,255,0.72)"
                                            fontSize="sm"
                                            fontWeight="600"
                                            mb="8px"
                                            textAlign="left"
                                        >
                                            Row
                                        </FormLabel>
                                        <Flex
                                            align="center"
                                            gap={{ base: '10px', sm: '14px' }}
                                            bg="#1e1f22"
                                            borderRadius="10px"
                                            px="16px"
                                            py="14px"
                                            border="1px solid rgba(255,255,255,0.05)"
                                            boxShadow="inset 0 1px 0 rgba(255,255,255,0.04)"
                                        >
                                            <Text
                                                as="span"
                                                fontSize="md"
                                                fontWeight="800"
                                                color="#ffffff"
                                                minW="24px"
                                                textAlign="center"
                                                flexShrink={0}
                                                sx={{
                                                    textShadow:
                                                        '0 0 10px rgba(255,255,255,0.45), 0 0 4px rgba(255,255,255,0.25), 0 1px 0 rgba(0,0,0,0.45)',
                                                }}
                                            >
                                                {rows}
                                            </Text>
                                            <Slider
                                                aria-label="Row"
                                                flex="1"
                                                minW={0}
                                                min={8}
                                                max={16}
                                                step={1}
                                                value={rows}
                                                onChange={(v) => setRows(v)}
                                                isDisabled={isAnimating || betLoading || isAutoRunning}
                                                focusThumbOnChange={false}
                                            >
                                                <SliderTrack bg="#2a2d2e" h="6px" borderRadius="3px">
                                                    <SliderFilledTrack bg={RUBIC_CYAN} borderRadius="3px" />
                                                </SliderTrack>
                                                <SliderThumb
                                                    bg="#fff"
                                                    w="12px"
                                                    h="24px"
                                                    borderRadius="6px"
                                                    border="none"
                                                    boxShadow="none"
                                                    _focus={{ boxShadow: 'none' }}
                                                    position="relative"
                                                    _hover={{ bg: '#fff' }}
                                                    _active={{ bg: '#fff' }}
                                                >
                                                    <Box
                                                        position="absolute"
                                                        top="50%"
                                                        left="50%"
                                                        transform="translate(-50%, -50%)"
                                                        w="8px"
                                                        h="12px"
                                                        display="flex"
                                                        flexDirection="column"
                                                        justifyContent="space-between"
                                                        pointerEvents="none"
                                                    >
                                                        <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                        <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                        <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                    </Box>
                                                </SliderThumb>
                                            </Slider>
                                            <Text
                                                as="span"
                                                fontSize="md"
                                                fontWeight="800"
                                                color="#ffffff"
                                                flexShrink={0}
                                                minW="24px"
                                                textAlign="center"
                                                sx={{
                                                    textShadow:
                                                        '0 0 10px rgba(255,255,255,0.45), 0 0 4px rgba(255,255,255,0.25), 0 1px 0 rgba(0,0,0,0.45)',
                                                }}
                                            >
                                                16
                                            </Text>
                                        </Flex>
                                    </FormControl>

                                    <Button
                                        h="46px"
                                        w="100%"
                                        maxW={PANEL_INNER_MAX_W}
                                        fontSize="md"
                                        fontWeight="bold"
                                        borderRadius="20px"
                                        bg={RUBIC_CYAN}
                                        color="#fff"
                                        border={`2px solid ${RUBIC_CYAN}`}
                                        _hover={{
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(0, 212, 255, 0.35)',
                                        }}
                                        _active={{ transform: 'translateY(0)' }}
                                        onClick={handleBet}
                                        isDisabled={
                                            isAnimating ||
                                            betLoading ||
                                            isAutoRunning ||
                                            !amount ||
                                            parseFloat(amount) < MIN_AMOUNT ||
                                            balance < parseFloat(amount)
                                        }
                                        isLoading={betLoading}
                                    >
                                        BET
                                    </Button>

                                    <Text
                                        fontSize="10px"
                                        color="rgba(255,255,255,0.45)"
                                        textAlign="center"
                                        maxW={PANEL_INNER_MAX_W}
                                        lineHeight="1.5"
                                    >
                                        Outcomes are resolved on the server; history and totals are saved to your account.
                                    </Text>
                                </VStack>
                            ) : (
                                <VStack spacing="20px" align="stretch" w="100%" maxW={PANEL_INNER_MAX_W} mx="auto">
                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                            Amount
                                        </FormLabel>
                                        <GradientBorder borderRadius="20px" w="100%">
                                            <Flex
                                                w="100%"
                                                align="center"
                                                justify="space-between"
                                                bg="#323738"
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
                                                    value={amount}
                                                    onChange={handleAmountChange}
                                                    onBlur={handleAmountBlur}
                                                    _focus={{ boxShadow: 'none' }}
                                                    flex="1"
                                                    isDisabled={isAnimating || isAutoRunning}
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
                                                        borderRadius="0"
                                                        borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                        onClick={() => {
                                                            const cur = parseFloat(amount || MIN_AMOUNT);
                                                            setAmount(
                                                                Math.max(
                                                                    MIN_AMOUNT,
                                                                    Math.min(maxAmount, cur / 2)
                                                                ).toFixed(2)
                                                            );
                                                        }}
                                                        isDisabled={isAnimating || isAutoRunning}
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
                                                        borderRadius="0"
                                                        borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                        borderTopRightRadius="18px"
                                                        borderBottomRightRadius="18px"
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                        onClick={() => {
                                                            const cur = parseFloat(amount || MIN_AMOUNT);
                                                            setAmount(
                                                                Math.min(maxAmount, cur * 2).toFixed(2)
                                                            );
                                                        }}
                                                        isDisabled={isAnimating || isAutoRunning}
                                                    >
                                                        ×2
                                                    </Button>
                                                </HStack>
                                            </Flex>
                                        </GradientBorder>
                                        <HStack spacing="8px" mt="10px" w="100%">
                                            {presetChip('1', 1)}
                                            {presetChip('5', 5)}
                                            {presetChip('10', 10)}
                                            {presetChip('20', 20)}
                                        </HStack>
                                    </FormControl>

                                    <FormControl w="100%" maxW={PANEL_INNER_MAX_W}>
                                        <FormLabel
                                            color="rgba(255,255,255,0.72)"
                                            fontSize="sm"
                                            fontWeight="600"
                                            mb="8px"
                                            textAlign="left"
                                        >
                                            Row
                                        </FormLabel>
                                        <Flex
                                            align="center"
                                            gap={{ base: '10px', sm: '14px' }}
                                            bg="#1e1f22"
                                            borderRadius="10px"
                                            px="16px"
                                            py="14px"
                                            border="1px solid rgba(255,255,255,0.05)"
                                            boxShadow="inset 0 1px 0 rgba(255,255,255,0.04)"
                                        >
                                            <Text
                                                as="span"
                                                fontSize="md"
                                                fontWeight="800"
                                                color="#ffffff"
                                                minW="24px"
                                                textAlign="center"
                                                flexShrink={0}
                                                sx={{
                                                    textShadow:
                                                        '0 0 10px rgba(255,255,255,0.45), 0 0 4px rgba(255,255,255,0.25), 0 1px 0 rgba(0,0,0,0.45)',
                                                }}
                                            >
                                                {rows}
                                            </Text>
                                            <Slider
                                                aria-label="Row"
                                                flex="1"
                                                minW={0}
                                                min={8}
                                                max={16}
                                                step={1}
                                                value={rows}
                                                onChange={(v) => setRows(v)}
                                                isDisabled={isAnimating || betLoading || isAutoRunning}
                                                focusThumbOnChange={false}
                                            >
                                                <SliderTrack bg="#2a2d2e" h="6px" borderRadius="3px">
                                                    <SliderFilledTrack bg={RUBIC_CYAN} borderRadius="3px" />
                                                </SliderTrack>
                                                <SliderThumb
                                                    bg="#fff"
                                                    w="12px"
                                                    h="24px"
                                                    borderRadius="6px"
                                                    border="none"
                                                    boxShadow="none"
                                                    _focus={{ boxShadow: 'none' }}
                                                    position="relative"
                                                    _hover={{ bg: '#fff' }}
                                                    _active={{ bg: '#fff' }}
                                                >
                                                    <Box
                                                        position="absolute"
                                                        top="50%"
                                                        left="50%"
                                                        transform="translate(-50%, -50%)"
                                                        w="8px"
                                                        h="12px"
                                                        display="flex"
                                                        flexDirection="column"
                                                        justifyContent="space-between"
                                                        pointerEvents="none"
                                                    >
                                                        <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                        <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                        <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                    </Box>
                                                </SliderThumb>
                                            </Slider>
                                            <Text
                                                as="span"
                                                fontSize="md"
                                                fontWeight="800"
                                                color="#ffffff"
                                                flexShrink={0}
                                                minW="24px"
                                                textAlign="center"
                                                sx={{
                                                    textShadow:
                                                        '0 0 10px rgba(255,255,255,0.45), 0 0 4px rgba(255,255,255,0.25), 0 1px 0 rgba(0,0,0,0.45)',
                                                }}
                                            >
                                                16
                                            </Text>
                                        </Flex>
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
                                                        setAutoBetTarget(
                                                            n <= 0 ? null : Math.min(n, 99999)
                                                        );
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
                                        h="46px"
                                        w="100%"
                                        maxW={PANEL_INNER_MAX_W}
                                        mx="auto"
                                        borderRadius="20px"
                                        fontWeight="bold"
                                        fontSize="md"
                                        bg={isAutoRunning ? '#c53030' : RUBIC_CYAN}
                                        color="#fff"
                                        border={
                                            isAutoRunning
                                                ? '2px solid #c53030'
                                                : `2px solid ${RUBIC_CYAN}`
                                        }
                                        _hover={{
                                            transform: isAutoRunning ? undefined : 'translateY(-2px)',
                                            boxShadow: isAutoRunning
                                                ? undefined
                                                : '0 4px 12px rgba(0, 212, 255, 0.35)',
                                            bg: isAutoRunning ? '#9b2c2c' : RUBIC_CYAN,
                                        }}
                                        _active={{ transform: 'translateY(0)' }}
                                        onClick={isAutoRunning ? handleStopAuto : handleStartAuto}
                                        isDisabled={
                                            !isAutoRunning &&
                                            (isAnimating ||
                                                betLoading ||
                                                !amount ||
                                                parseFloat(amount) < MIN_AMOUNT ||
                                                balance < parseFloat(amount))
                                        }
                                    >
                                        {isAutoRunning ? 'Stop Auto Bet' : 'Start Auto Bet'}
                                    </Button>
                                </VStack>
                            )}
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem
                    area="game"
                    minW={0}
                    maxW="100%"
                    display="flex"
                    flexDirection="column"
                    minH={{ base: 'auto', '1550px': PLINKO_DESKTOP_COL_MIN_H }}
                    alignSelf="stretch"
                >
                    <Card
                        pt="8px"
                        pb="12px"
                        px={{ base: '12px', md: '18px' }}
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        w="100%"
                        h="100%"
                        minH="100%"
                        position="relative"
                        overflow="hidden"
                        bg="#2a2d2e"
                        borderRadius="20px"
                        border="1px solid rgba(255,255,255,0.08)"
                        boxShadow="none"
                    >
                        <Box flexShrink={0} w="100%" maxW="760px" minW={0} mx="auto">
                            <PlinkoBoard
                                rows={rows}
                                multipliers={multipliers}
                                pathSteps={pathSteps}
                                dropTick={dropTick}
                                isAnimating={isAnimating}
                                onAnimationDone={onAnimationDone}
                                highlightSlot={highlightSlot}
                                hyperMode={hyperMode}
                                onHyperModeChange={setHyperMode}
                                ballImageSrc={plinko}
                            />
                        </Box>
                    </Card>
                </GridItem>

                <PlinkoLiveResults rows={liveFeed} desktopMinH={PLINKO_DESKTOP_COL_MIN_H} />
            </Grid>

            <PlinkoBetHistory results={history} />
        </Box>
    );
}
