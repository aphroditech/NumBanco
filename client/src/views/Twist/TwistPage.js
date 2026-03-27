import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import {
  Box,
  Grid,
  GridItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useMediaQuery,
  IconButton,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Flex,
} from '@chakra-ui/react';
const twistBg = '/twist/twist.png';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TwistRealView from './TwistItem/TwistRealView';
import TwistWheel from './TwistItem/TwistWheel';
import TwistBetReels from './TwistItem/TwistBetReels';
import BetHistory from './TwistItem/BetHistory';

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ClickButton from 'components/Input/ClickButton';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import { twistBet, twistCashOut } from 'action/TwistActions';
import { onlineUser, offlineUser } from 'action/BetActions';
import {
    twistTotalMultiplierSum,
    multIndexInLadder,
    TWIST_PURPLE_MULTS,
    TWIST_ORANGE_MULTS,
    TWIST_GREEN_MULTS,
} from './twistLadderMath';

const TWIST_SYMBOL_KEYS = ['green', 'orange', 'purple', 'stone', 'mouse'];

function randomTwistSymbol() {
    return TWIST_SYMBOL_KEYS[Math.floor(Math.random() * TWIST_SYMBOL_KEYS.length)];
}

export default function TwistPage() {
    const MIN_AMOUNT = 0.5;
    const MAX_AMOUNT = 20;
    const AMOUNT_STEP = 0.5;
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxBet = Math.max(MIN_AMOUNT, Math.min(MAX_AMOUNT, balance));
    const lastTwistBet = Number(user?.twistLastBetAmount ?? 0);
    const idxG = Math.max(0, Math.floor(Number(user?.twistGreenMultIndex ?? 0)));
    const idxO = Math.max(0, Math.floor(Number(user?.twistOrangeMultIndex ?? 0)));
    const idxP = Math.max(0, Math.floor(Number(user?.twistPurpleMultIndex ?? 0)));
    const resultMultiplierSum = twistTotalMultiplierSum(idxP, idxO, idxG);
    const cashOutWinPreview =
        Math.round(lastTwistBet * resultMultiplierSum * 100) / 100;
    /** After a successful Bet, server sets twistLastBetAmount; cash out clears it. */
    const canCashOut = lastTwistBet > 1e-9;
    const [centerSymbol, setCenterSymbol] = useState(randomTwistSymbol);
    const [isBetting, setIsBetting] = useState(false);
    const [isCashOutLoading, setIsCashOutLoading] = useState(false);
    /** Lock amount while a round is active; unlock after cash out resets the round. */
    const amountLocked = canCashOut || isBetting || isCashOutLoading;
    /** Wheel sector glow per ring: index into that ring’s labels (null = no glow). */
    const [ringHighlights, setRingHighlights] = useState({ p: null, o: null, g: null });
    /** Forward sweep starts after this segment index (null = from ring start). */
    const [ringSweepAfter, setRingSweepAfter] = useState({ p: null, o: null, g: null });
    const [ringShrinkFrom, setRingShrinkFrom] = useState({ p: null, o: null, g: null });
    const [ringMouseExitIndex, setRingMouseExitIndex] = useState({ p: null, o: null, g: null });
    const [ringGlowMode, setRingGlowMode] = useState({ p: 'forward', o: 'forward', g: 'forward' });
    /** Bumped on each purple/orange/green hit so the glow remounts and animates. */
    const [ringGlowRevision, setRingGlowRevision] = useState({ p: 0, o: 0, g: 0 });
    const [cashoutClearing, setCashoutClearing] = useState(false);
    const [cashoutSnapshot, setCashoutSnapshot] = useState({ p: null, o: null, g: null });
    /** idle | spinning | settling | done — slot-style reels above the wheel on bet. */
    const [reelPhase, setReelPhase] = useState('idle');
    const [reelSpinResult, setReelSpinResult] = useState({ symbol: null, multiplier: null });
    const reelDoneTimerRef = useRef(null);
    const reelSettleDoneRef = useRef(false);
    /** Bet API payload applied to wheel rings + center gem after hub reel animation ends. */
    const pendingBetOutcomeRef = useRef(null);

    const [isNarrowLayout] = useMediaQuery('(max-width: 1799px)');
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [amount, setAmount] = useState(String(MIN_AMOUNT));
    const amountRef = useRef(String(MIN_AMOUNT));
    /** Same win FX pattern as Alpha Tree cash-out. */
    const twistMainCardRef = useRef(null);
    const [cashOutWinFx, setCashOutWinFx] = useState({
        visible: false,
        amount: '0.00',
        subtitle: '',
    });
    const [cashOutFxAnchorRect, setCashOutFxAnchorRect] = useState(null);
    const cashOutFxTimeoutRef = useRef(null);

    const updateAmount = (value) => {
        setAmount(value);
        amountRef.current = value;
    };

    const getNumericAmount = useCallback(() => {
        const n = parseFloat(amountRef.current);
        return Number.isFinite(n) ? n : MIN_AMOUNT;
    }, []);

    /** Snap to 0.5 steps, clamp to [MIN_AMOUNT, maxBet]. */
    const clampBet = useCallback(
        (raw) => {
            const snapped = Math.round(raw / AMOUNT_STEP) * AMOUNT_STEP;
            return Math.min(maxBet, Math.max(MIN_AMOUNT, snapped));
        },
        [maxBet],
    );

    const commitNumericAmount = useCallback(
        (n) => {
            const c = clampBet(n);
            updateAmount(c.toFixed(2));
        },
        [clampBet],
    );

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            updateAmount('');
            return;
        }
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            updateAmount(value);
        }
    };

    const handleAmountBlur = () => {
        const num = parseFloat(amountRef.current);
        if (!Number.isFinite(num)) {
            commitNumericAmount(MIN_AMOUNT);
            return;
        }
        commitNumericAmount(num);
    };

    useEffect(() => {
        if (amountRef.current === '') return;
        commitNumericAmount(getNumericAmount());
    }, [maxBet, commitNumericAmount, getNumericAmount]);

    const decreaseByStep = () => commitNumericAmount(getNumericAmount() - AMOUNT_STEP);
    const increaseByStep = () => commitNumericAmount(getNumericAmount() + AMOUNT_STEP);
    const gameCardMaxH = 'calc(100dvh - 108px)';

    const finishCashoutGlow = useCallback(() => {
        setCashoutClearing(false);
        setCashoutSnapshot({ p: null, o: null, g: null });
        setRingHighlights({ p: null, o: null, g: null });
        setRingSweepAfter({ p: null, o: null, g: null });
        setRingShrinkFrom({ p: null, o: null, g: null });
        setRingMouseExitIndex({ p: null, o: null, g: null });
        setRingGlowMode({ p: 'forward', o: 'forward', g: 'forward' });
        setRingGlowRevision({ p: 0, o: 0, g: 0 });
        setIsCashOutLoading(false);
    }, []);

    const onMouseExitGlowFinished = useCallback((key) => {
        setRingMouseExitIndex((s) => ({ ...s, [key]: null }));
        setRingGlowMode((m) => ({ ...m, [key]: 'forward' }));
    }, []);

    useEffect(
        () => () => {
            if (reelDoneTimerRef.current) {
                clearTimeout(reelDoneTimerRef.current);
            }
            if (cashOutFxTimeoutRef.current) {
                clearTimeout(cashOutFxTimeoutRef.current);
                cashOutFxTimeoutRef.current = null;
            }
        },
        [],
    );
    useEffect(() => {
        onlineUser(17);
        return () => {
            offlineUser(17);
        };
    }, []);

    const applyPendingBetOutcome = useCallback((pending) => {
        if (!pending?.symbol) return;
        const sym = pending.symbol;
        const m = pending.multiplier;
        setCenterSymbol(sym);
        if (sym === 'purple') {
            const idx = multIndexInLadder(TWIST_PURPLE_MULTS, m);
            setRingMouseExitIndex((s) => ({ ...s, p: null }));
            setRingHighlights((h) => {
                if (h.p != null && idx < h.p) {
                    setRingShrinkFrom((s) => ({ ...s, p: h.p }));
                    setRingSweepAfter((s) => ({ ...s, p: null }));
                    setRingGlowMode((gm) => ({ ...gm, p: 'shrinkTail' }));
                } else {
                    setRingShrinkFrom((s) => ({ ...s, p: null }));
                    setRingSweepAfter((s) => ({ ...s, p: h.p }));
                    setRingGlowMode((gm) => ({ ...gm, p: 'forward' }));
                }
                return { ...h, p: idx };
            });
            setRingGlowRevision((r) => ({ ...r, p: r.p + 1 }));
        } else if (sym === 'orange') {
            const idx = multIndexInLadder(TWIST_ORANGE_MULTS, m);
            setRingMouseExitIndex((s) => ({ ...s, o: null }));
            setRingHighlights((h) => {
                if (h.o != null && idx < h.o) {
                    setRingShrinkFrom((s) => ({ ...s, o: h.o }));
                    setRingSweepAfter((s) => ({ ...s, o: null }));
                    setRingGlowMode((gm) => ({ ...gm, o: 'shrinkTail' }));
                } else {
                    setRingShrinkFrom((s) => ({ ...s, o: null }));
                    setRingSweepAfter((s) => ({ ...s, o: h.o }));
                    setRingGlowMode((gm) => ({ ...gm, o: 'forward' }));
                }
                return { ...h, o: idx };
            });
            setRingGlowRevision((r) => ({ ...r, o: r.o + 1 }));
        } else if (sym === 'green') {
            const idx = multIndexInLadder(TWIST_GREEN_MULTS, m);
            setRingMouseExitIndex((s) => ({ ...s, g: null }));
            setRingHighlights((h) => {
                if (h.g != null && idx < h.g) {
                    setRingShrinkFrom((s) => ({ ...s, g: h.g }));
                    setRingSweepAfter((s) => ({ ...s, g: null }));
                    setRingGlowMode((gm) => ({ ...gm, g: 'shrinkTail' }));
                } else {
                    setRingShrinkFrom((s) => ({ ...s, g: null }));
                    setRingSweepAfter((s) => ({ ...s, g: h.g }));
                    setRingGlowMode((gm) => ({ ...gm, g: 'forward' }));
                }
                return { ...h, g: idx };
            });
            setRingGlowRevision((r) => ({ ...r, g: r.g + 1 }));
        } else if (sym === 'stone') {
            // no change to ring highlights
        } else if (sym === 'mouse') {
            setRingHighlights((h) => {
                const np = h.p != null ? (h.p > 0 ? h.p - 1 : null) : null;
                const no = h.o != null ? (h.o > 0 ? h.o - 1 : null) : null;
                const ng = h.g != null ? (h.g > 0 ? h.g - 1 : null) : null;
                setRingSweepAfter({ p: null, o: null, g: null });
                setRingShrinkFrom({
                    p: h.p != null && np != null && np < h.p ? h.p : null,
                    o: h.o != null && no != null && no < h.o ? h.o : null,
                    g: h.g != null && ng != null && ng < h.g ? h.g : null,
                });
                setRingMouseExitIndex({
                    p: h.p != null && np === null ? h.p : null,
                    o: h.o != null && no === null ? h.o : null,
                    g: h.g != null && ng === null ? h.g : null,
                });
                const modeFor = (was, now) => {
                    if (was == null) return 'forward';
                    if (now != null && now < was) return 'shrinkTail';
                    if (now == null) return 'reverse';
                    return 'forward';
                };
                setRingGlowMode({
                    p: modeFor(h.p, np),
                    o: modeFor(h.o, no),
                    g: modeFor(h.g, ng),
                });
                const bump = (was, now) =>
                    (was != null && now != null && now < was) || (was != null && now === null);
                setRingGlowRevision((r) => ({
                    p: r.p + (bump(h.p, np) ? 1 : 0),
                    o: r.o + (bump(h.o, no) ? 1 : 0),
                    g: r.g + (bump(h.g, ng) ? 1 : 0),
                }));
                return { p: np, o: no, g: ng };
            });
        }
    }, []);

    const onReelSpinSettled = useCallback(() => {
        if (reelSettleDoneRef.current) return;
        reelSettleDoneRef.current = true;
        const pending = pendingBetOutcomeRef.current;
        pendingBetOutcomeRef.current = null;
        applyPendingBetOutcome(pending);
        setIsBetting(false);
        setReelPhase('done');
        if (reelDoneTimerRef.current) clearTimeout(reelDoneTimerRef.current);
        reelDoneTimerRef.current = setTimeout(() => {
            reelDoneTimerRef.current = null;
            setReelPhase('idle');
        }, 900);
    }, [applyPendingBetOutcome]);

    useEffect(() => {
        if (reelPhase === 'settling') {
            reelSettleDoneRef.current = false;
        }
        if (reelPhase !== 'settling') return undefined;
        const id = setTimeout(() => {
            onReelSpinSettled();
        }, 5200);
        return () => clearTimeout(id);
    }, [reelPhase, onReelSpinSettled]);

    const handleBet = async () => {
        if (isBetting || isCashOutLoading) return;
        const amt = getNumericAmount();
        if (amt > balance + 1e-9) {
            toast.error("Insufficient balance");
            return;
        }
        if (reelDoneTimerRef.current) {
            clearTimeout(reelDoneTimerRef.current);
            reelDoneTimerRef.current = null;
        }
        setIsBetting(true);
        reelSettleDoneRef.current = false;
        pendingBetOutcomeRef.current = null;
        setReelPhase('spinning');
        setReelSpinResult({ symbol: null, multiplier: null });
        const { data, error } = await twistBet(amt, dispatch, history);
        if (error) {
            if (reelDoneTimerRef.current) {
                clearTimeout(reelDoneTimerRef.current);
                reelDoneTimerRef.current = null;
            }
            setReelPhase('idle');
            toast.error(error);
            setIsBetting(false);
            return;
        }
        if (data?.symbol) {
            pendingBetOutcomeRef.current = {
                symbol: data.symbol,
                multiplier: data.multiplier,
            };
            setReelSpinResult({
                symbol: data.symbol,
                multiplier: (() => {
                    const m = Number(data.multiplier);
                    return Number.isFinite(m) ? m : null;
                })(),
            });
            setReelPhase('settling');
        } else {
            setReelPhase('idle');
            setIsBetting(false);
        }
    };

    const handleCashOut = async () => {
        if (isCashOutLoading || isBetting || !canCashOut) return;
        setIsCashOutLoading(true);
        const cardRect = twistMainCardRef.current?.getBoundingClientRect?.();
        const anchorForFx = cardRect
            ? {
                  left: cardRect.left,
                  top: cardRect.top,
                  width: cardRect.width,
                  height: cardRect.height,
              }
            : null;
        const hadGlow =
            ringHighlights.p != null || ringHighlights.o != null || ringHighlights.g != null;
        const { data, error } = await twistCashOut(dispatch, history);
        if (error) {
            toast.error(error);
            setIsCashOutLoading(false);
            return;
        }
        const w = Number(data?.win ?? 0);
        const resultSum = Number(data?.result);
        if (w > 0) {
            toast.success(`Collected ${w.toFixed(2)}`);
            setCashOutFxAnchorRect(anchorForFx);
            setCashOutWinFx({
                visible: true,
                amount: w.toFixed(2),
                subtitle:
                    Number.isFinite(resultSum) && resultSum > 0
                        ? `Total multiplier ×${resultSum.toFixed(2)}`
                        : '',
            });
            if (cashOutFxTimeoutRef.current) {
                clearTimeout(cashOutFxTimeoutRef.current);
            }
            const fxMs = 2600;
            cashOutFxTimeoutRef.current = setTimeout(() => {
                cashOutFxTimeoutRef.current = null;
                setCashOutWinFx((s) => ({ ...s, visible: false }));
            }, fxMs);
        } else {
            toast.success('Multipliers reset');
        }
        if (hadGlow) {
            setCashoutSnapshot({ ...ringHighlights });
            setCashoutClearing(true);
        } else {
            finishCashoutGlow();
        }
    };

    return (
        <Box minH="100vh" bg="transparent" marginTop={{ base: '76px', md: '84px' }} w="100%" maxW="100%">
            <WinFireworksEffect
                isVisible={cashOutWinFx.visible}
                totalEarn={cashOutWinFx.amount}
                subtitle={cashOutWinFx.subtitle}
                duration={2600}
                anchorRect={cashOutFxAnchorRect}
            />
            <Box px={{ base: '16px', md: '24px' }} w="100%" maxW="100%">
                <Grid
                    templateAreas={
                        isNarrowLayout ? '"game" "empty"' : '"game empty"'
                    }
                    templateColumns={isNarrowLayout ? '1fr' : '6fr 2fr'}
                    templateRows={isNarrowLayout ? 'auto auto' : 'auto'}
                    gap={{ base: '16px', md: '24px' }}
                    w="100%"
                >
                    <GridItem area="game" minW={0} maxH={gameCardMaxH} alignSelf="stretch">
                        <Card
                            ref={twistMainCardRef}
                            w="100%"
                            maxH={gameCardMaxH}
                            display="flex"
                            flexDirection="column"
                            overflow="hidden"
                        >
                        <CardBody p={0} flex="1" minH={0} display="flex" flexDirection="column" overflow="hidden">
                            <VStack spacing={0} align="stretch" w="100%" minW={0} flex="1" minH={0} overflow="hidden">
                                <Box
                                    position="relative"
                                    w="100%"
                                    flex="1"
                                    minH={0}
                                    overflow="hidden"
                                    bg="#1a1d20"
                                    display="flex"
                                    flexDirection="column"
                                >
                                    <Box
                                        position="absolute"
                                        inset={0}
                                        bgImage={`url("${twistBg}")`}
                                        bgSize="cover"
                                        bgPos="center"
                                        aria-hidden
                                    />
                                    <IconButton
                                        aria-label="How to play Twist"
                                        icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                        position="absolute"
                                        top={{ base: 2, md: 3 }}
                                        right={{ base: 2, md: 3 }}
                                        zIndex={2}
                                        size="sm"
                                        bg="rgba(0, 0, 0, 0.35)"
                                        color="#00d4ff"
                                        borderRadius="full"
                                        backdropFilter="blur(6px)"
                                        _hover={{ bg: 'rgba(0, 0, 0, 0.5)', color: '#00D4FF' }}
                                        onClick={() => setIsHelpModalOpen(true)}
                                    />
                                    <Box
                                        position="relative"
                                        zIndex={1}
                                        flex="1"
                                        minH={0}
                                        h="100%"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        pt={2}
                                        pb={2}
                                        px={{ base: 2, md: 4 }}
                                    >
                                        <Box
                                            position="relative"
                                            w="100%"
                                            h="100%"
                                            maxW="560px"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            minH={0}
                                            flex="1"
                                        >
                                            <TwistWheel
                                                centerSymbol={centerSymbol}
                                                hideCenterGem={reelPhase !== 'idle'}
                                                ringHighlights={ringHighlights}
                                                ringSweepAfter={ringSweepAfter}
                                                ringShrinkFrom={ringShrinkFrom}
                                                ringMouseExitIndex={ringMouseExitIndex}
                                                ringGlowMode={ringGlowMode}
                                                ringGlowRevision={ringGlowRevision}
                                                cashoutClearing={cashoutClearing}
                                                cashoutSnapshot={cashoutSnapshot}
                                                onCashoutGlowFinished={finishCashoutGlow}
                                                onMouseExitGlowFinished={onMouseExitGlowFinished}
                                            />
                                            {reelPhase !== 'idle' ? (
                                                <Box
                                                    position="absolute"
                                                    left="50%"
                                                    top="50%"
                                                    transform="translate(-50%, -50%)"
                                                    zIndex={5}
                                                    w={`${(160 / 600) * 100}%`}
                                                    minW="118px"
                                                    maxW="158px"
                                                    aspectRatio={1}
                                                    borderRadius="full"
                                                    overflow="hidden"
                                                    bg="transparent"
                                                    display="flex"
                                                    flexDirection="column"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    pointerEvents="none"
                                                >
                                                    <TwistBetReels
                                                        variant="center"
                                                        phase={reelPhase}
                                                        seedSymbol={centerSymbol}
                                                        resultSymbol={reelSpinResult.symbol}
                                                        multiplier={reelSpinResult.multiplier}
                                                        onSettleComplete={onReelSpinSettled}
                                                    />
                                                </Box>
                                            ) : null}
                                        </Box>
                                    </Box>
                                </Box>

                            <Box
                                w="100%"
                                flexShrink={0}
                                pt="10px"
                                pb="12px"
                                px={{ base: 3, md: 5 }}
                                bg="linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(18,20,22,0.92) 100%)"
                                borderTop="1px solid rgba(0, 212, 255, 0.35)"
                            >
                                <Text
                                    color="rgba(255,255,255,0.75)"
                                    fontSize="xs"
                                    fontWeight="700"
                                    letterSpacing="0.08em"
                                    textTransform="uppercase"
                                    textAlign="center"
                                    mb={2}
                                >
                                    Bet amount
                                </Text>
                                <Flex
                                    align="center"
                                    justify="center"
                                    gap={2}
                                    mb={2}
                                    flexWrap="wrap"
                                >
                                    <Text color="rgba(255,255,255,0.65)" fontSize="xs" fontWeight="600">
                                        Win
                                    </Text>
                                    <Text color="#6DC64B" fontSize="sm" fontWeight="800">
                                        {cashOutWinPreview.toFixed(2)}
                                    </Text>
                                </Flex>
                                <Flex
                                    direction={{ base: 'column', md: 'row' }}
                                    align="center"
                                    justify="center"
                                    gap={{ base: 4, md: 6 }}
                                    w="100%"
                                >
                                    <Flex
                                        align="center"
                                        justify="center"
                                        gap="6px"
                                        flexWrap="wrap"
                                        w={{ base: '100%', md: 'auto' }}
                                    >
                                        <Button
                                            size="sm"
                                            h="56px"
                                            minW="52px"
                                            px="10px"
                                            fontSize="xs"
                                            fontWeight="bold"
                                            bg="rgba(0, 212, 255, 0.2)"
                                            color="#00D4FF"
                                            border="1px solid rgba(0, 212, 255, 0.5)"
                                            borderRadius="8px"
                                            _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                            onClick={() => commitNumericAmount(MIN_AMOUNT)}
                                            isDisabled={amountLocked}
                                        >
                                            Min
                                        </Button>
                                        <HStack
                                            spacing="4px"
                                            bg="#323738"
                                            borderRadius="8px"
                                            px="6px"
                                            h="56px"
                                            border="1px solid rgba(255, 255, 255, 0.1)"
                                        >
                                            <IconButton
                                                aria-label="Decrease bet"
                                                icon={<RemoveIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="28px"
                                                w="28px"
                                                minW="28px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="6px"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                onClick={decreaseByStep}
                                                isDisabled={amountLocked || getNumericAmount() <= MIN_AMOUNT + 1e-9}
                                            />
                                            <Input
                                                name="amount"
                                                type="text"
                                                inputMode="decimal"
                                                autoComplete="off"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                textAlign="center"
                                                minH="52px"
                                                minW={{ base: '100px', sm: '120px' }}
                                                fontSize="md"
                                                fontWeight="bold"
                                                color="#fff"
                                                bg="transparent"
                                                border="transparent"
                                                p="0"
                                                _hover={{ border: 'none' }}
                                                placeholder={String(MIN_AMOUNT)}
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
                                                isDisabled={amountLocked}
                                            />
                                            <IconButton
                                                aria-label="Increase bet"
                                                icon={<AddIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="28px"
                                                w="28px"
                                                minW="28px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="6px"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                onClick={increaseByStep}
                                                isDisabled={amountLocked || getNumericAmount() + AMOUNT_STEP > maxBet + 1e-9}
                                            />
                                        </HStack>
                                        <Button
                                            size="sm"
                                            h="56px"
                                            minW="52px"
                                            px="10px"
                                            fontSize="xs"
                                            fontWeight="bold"
                                            bg="rgba(0, 212, 255, 0.2)"
                                            color="#00D4FF"
                                            border="1px solid rgba(0, 212, 255, 0.5)"
                                            borderRadius="8px"
                                            _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                            onClick={() => commitNumericAmount(maxBet)}
                                            isDisabled={amountLocked}
                                        >
                                            Max
                                        </Button>
                                    </Flex>
                                    <HStack
                                        spacing={3}
                                        w="100%"
                                        maxW={{ md: '420px' }}
                                        align="center"
                                        flexWrap="nowrap"
                                    >
                                        <ClickButton
                                            flex="1"
                                            minW={0}
                                            maxW="none"
                                            w="auto"
                                            alignSelf="center"
                                            mt={0}
                                            mb={0}
                                            h="56px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#00D4FF"}
                                            color="#fff"
                                            border={"1px solid rgba(0, 212, 255, 0.3)"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            label="Bet"
                                            onClick={handleBet}
                                            disabled={
                                                isBetting ||
                                                isCashOutLoading ||
                                                getNumericAmount() > balance + 1e-9
                                            }
                                        />
                                        <ClickButton
                                            flex="1"
                                            minW={0}
                                            maxW="none"
                                            w="auto"
                                            alignSelf="center"
                                            mt={0}
                                            mb={0}
                                            h="56px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg="#2f855a"
                                            color="#fff"
                                            border="1px solid rgba(72, 187, 120, 0.45)"
                                            _hover={{
                                                bg: '#276749',
                                                borderColor: 'rgba(72, 187, 120, 0.6)',
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            label={isCashOutLoading ? '…' : 'Cash out'}
                                            onClick={handleCashOut}
                                            disabled={
                                                !canCashOut ||
                                                isBetting ||
                                                isCashOutLoading
                                            }
                                        />
                                    </HStack>
                                </Flex>
                            </Box>
                            </VStack>
                        </CardBody>
                        </Card>
                    </GridItem>

                    <GridItem
                        area="empty"
                        minW={0}
                        h="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        <Box
                            flex="1"
                            minH={0}
                            w="100%"
                            display="flex"
                            flexDirection="column"
                        >
                            <TwistRealView />
                        </Box>
                    </GridItem>
                </Grid>
                <BetHistory />
                <Modal
                    isOpen={isHelpModalOpen}
                    onClose={() => setIsHelpModalOpen(false)}
                    size="lg"
                    isCentered
                >
                    <ModalOverlay bg="blackAlpha.700" />
                    <ModalContent
                        pb="20px"
                        bg="#2a2d2e"
                        border="1px solid rgba(0, 212, 255, 0.3)"
                        maxH="80vh"
                        h="auto"
                        overflowY="auto"
                        className="pumping-modal-content"
                    >
                        <ModalHeader color="white">
                            Twist — how to play
                        </ModalHeader>
                        <ModalCloseButton
                            color="#fff"
                            _hover={{ color: '#00D4FF' }}
                        />
                        <ModalBody
                            py="0"
                            maxH="calc(80vh - 60px)"
                            overflowY="auto"
                            className="pumping-modal-body"
                        >
                            <Text color="rgba(255,255,255,0.88)" fontSize="sm" lineHeight="tall" mb={4}>
                                Twist shows three concentric rings. Each ring lists multipliers and special
                                segments (for example BONUS or locked boosts). The vertical highlight at the
                                top marks where the active result lines up when a spin completes.
                            </Text>
                            <Text color="rgba(255,255,255,0.72)" fontSize="sm" lineHeight="tall">
                                Payout rules (how the three rings combine with your bet) can be connected when
                                the play flow and API are ready. Until then, use RealView on the side to
                                follow recent rounds.
                            </Text>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </Box>
        </Box>
    );
}