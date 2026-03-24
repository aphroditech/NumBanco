import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    Grid,
    GridItem,
    Flex,
    Text,
    Input,
    Button,
    VStack,
    IconButton,
    HStack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Select,
    useMediaQuery,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js'; 
import CardBody from 'components/Card/CardBody.js';
import { useSelector, useDispatch } from 'react-redux';
import { rocketBet, rocketShotResult } from 'action/RocketActions';

import RealView from './RocketItems/RealView';  
import JavelinGame from './JavelinGame';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useHistory } from 'react-router-dom';
import History from './RocketItems/History';


const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
/** Match Dove Cross step increments for +/- controls */
const AMOUNT_STEP = 0.5;
/** Minimum time between bets (Fire stays disabled after a successful click). */
const FIRE_COOLDOWN_MS = 500;
/** Float tolerance for bet min / max checks (avoids 0.499999… disabling Fire). */

/** One “tick” of wait — MUST resolve even if rAF is paused (background tab) or never fires. */
function waitNextFrameOrTimeout(ms = 48) {
    return Promise.race([
        new Promise((resolve) => {
            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(() => resolve());
            } else {
                setTimeout(resolve, 16);
            }
        }),
        new Promise((resolve) => setTimeout(resolve, ms)),
    ]);
}

/**
 * Retry until Phaser starts a shot or we time out.
 * Never block only on rAF — that can hang forever when the tab is throttled.
 */
async function fireJavelinWhenReady(maxMs = 3500) {
    const now = () =>
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const start = now();
    while (true) {
        const elapsed = now() - start;
        if (elapsed > maxMs) break;
        if (typeof window !== 'undefined' && typeof window.fireJavelin === 'function') {
            try {
                if (window.fireJavelin() === true) return true;
            } catch (e) {
                console.error(e);
            }
        }
        await waitNextFrameOrTimeout(48);
    }
    return false;
}

/**
 * Redux `user.balance` may be missing while the navbar still shows stale digits, or come back as a string.
 * When unknown, don't coerce to 0 (that makes `balance >= bet` false and locks Fire forever).
 */

export default function RocketShotPage() {
    const dispatch = useDispatch();
    const history = useHistory();

    const [amount, setAmount] = useState(MIN_AMOUNT);
    /** True while the rocket is in flight (Phaser shot in progress). */
    const [isFiring, setIsFiring] = useState(false);
    /** True while /rocket/bet request is in flight — prevents double-submit without relying on isFiring alone. */
    const [isBetPending, setIsBetPending] = useState(false);
    /** True for FIRE_COOLDOWN_MS after each accepted Fire / canvas bet (rate limit). */
    const [isFireCooldown, setIsFireCooldown] = useState(false);
    const fireCooldownUntilRef = useRef(0);
    const fireCooldownTimerRef = useRef(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [mode, setMode] = useState("easy");
    /** "flat" = flat win display, "multiplier" = multiplier display (UI; extend payout logic if needed) */
    const [winMode, setWinMode] = useState("multiplier");
    const firingLockRef = useRef(false);

    /** Clears React state + ref + pending window globals so Fire never stays disabled. */
    const unlockShooting = useCallback(() => {
        firingLockRef.current = false;
        setIsBetPending(false);
        setIsFiring(false);
        if (typeof window !== 'undefined') {
            window.__rocketPendingMultiplier = null;
            window.__rocketPendingWinMode = null;
            window.__rocketPendingBetAmount = null;
        }
    }, []);

    const beginFireCooldown = useCallback(() => {
        fireCooldownUntilRef.current = Date.now() + FIRE_COOLDOWN_MS;
        setIsFireCooldown(true);
        if (fireCooldownTimerRef.current) {
            window.clearTimeout(fireCooldownTimerRef.current);
        }
        fireCooldownTimerRef.current = window.setTimeout(() => {
            fireCooldownUntilRef.current = 0;
            setIsFireCooldown(false);
            fireCooldownTimerRef.current = null;
        }, FIRE_COOLDOWN_MS);
    }, []);

    useEffect(
        () => () => {
            if (fireCooldownTimerRef.current) {
                window.clearTimeout(fireCooldownTimerRef.current);
                fireCooldownTimerRef.current = null;
            }
        },
        [],
    );
    
    const user = useSelector((state) => state.user.userInfo) || {};
    const rocketMultiplier = useSelector((state) => state.rocket?.multiplier ?? 0);
    const walletBalance = user.balance;
    const walletBalanceNum = Number(walletBalance);
    const hasKnownBalance = Number.isFinite(walletBalanceNum) && walletBalanceNum >= 0;
    const maxAmount = hasKnownBalance
        ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, walletBalanceNum))
        : MAX_AMOUNT;
    const [isNarrowLayout] = useMediaQuery("(max-width: 1799px)");

    const handleAmountChange = (e) => {
        const raw = e.target.value;
        const v = parseFloat(raw);
        if(v >= MIN_AMOUNT && v <= maxAmount) {
            setAmount(v);
        }
    };

    const handleRocketBet = async (amount, mode, selectedWinMode) => {
        if (Date.now() < fireCooldownUntilRef.current) return;
        if (firingLockRef.current) return;
        beginFireCooldown();
        firingLockRef.current = true;
        setIsBetPending(true);
        // Do NOT set isFiring until bet succeeds — avoids UI stuck "firing" during slow/failed API.

        // Used by Phaser scene to display the correct win label for this specific shot.
        if (typeof window !== 'undefined') {
            window.__rocketPendingBetAmount = parseFloat(amount);
            window.__rocketPendingWinMode = selectedWinMode;
        }
        try {
            const data = {
                bet: parseFloat(amount),
                level: mode,
            };
            const multiplier = await rocketBet(data, dispatch, history);
            // Store multiplier for the current shot (Phaser reads it inside `fire()`).
            if (typeof window !== 'undefined') {
                window.__rocketPendingMultiplier = multiplier;
            }
            // Keep isBetPending true until Phaser actually accepts the shot — prevents double-submit
            // and avoids isFiring=true when nothing launched (old bug: setIsFiring before fire()).
            if (typeof window !== 'undefined' && typeof window.fireJavelin === 'function') {
                const fired = await fireJavelinWhenReady();
                setIsBetPending(false);
                if (fired) {
                    setIsFiring(true);
                } else {
                    unlockShooting();
                }
            } else {
                setIsBetPending(false);
                unlockShooting();
            }
        } catch (error) {
            console.error(error);
            unlockShooting();
        }
    }

    // Never leave the page stuck from a prior session / failed Phaser handoff.
    useEffect(() => {
        unlockShooting();
    }, [unlockShooting]);

    // If Phaser never calls onJavelinShotEnd (edge case), unlock so the user can play again.
    useEffect(() => {
        if (!isFiring) return;
        const failSafe = window.setTimeout(() => {
            unlockShooting();
        }, 20000);
        return () => window.clearTimeout(failSafe);
    }, [isFiring, unlockShooting]);

    // Unlock the Fire button only when the current rocket shot is fully done
    // (hit or miss). This prevents overwriting the pending multiplier.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => {
            unlockShooting();
        };
        window.onJavelinShotEnd = handler;
        return () => {
            if (window.onJavelinShotEnd === handler) window.onJavelinShotEnd = undefined;
        };
    }, [unlockShooting]);

    // Allow firing by clicking the rocket/launch pad inside the Phaser canvas.
    useEffect(() => {
        if (typeof window === "undefined") return;

        const tryFireFromCanvas = () => {
            if (Date.now() < fireCooldownUntilRef.current) return;
            if (firingLockRef.current) return;
            const bet = parseFloat(amount);
            if (Number.isNaN(bet) || bet < MIN_AMOUNT) return;
            if (bet > maxAmount) return;
            if (hasKnownBalance && bet > walletBalanceNum) return;
            handleRocketBet(bet, mode, winMode);
        };

        window.onRocketShotBet = tryFireFromCanvas;
        return () => {
            if (window.onRocketShotBet === tryFireFromCanvas) window.onRocketShotBet = undefined;
        };
    }, [amount, mode, winMode, maxAmount, hasKnownBalance, walletBalanceNum, beginFireCooldown]);

    // Miss handler: always clear firing lock (onJavelinShotEnd runs first in GameScene, but this is idempotent).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.onRocketShotMiss = () => {
            unlockShooting();
            const data = {
                isWin: false,
                betAmount: parseFloat(amount),
                multiplier: 0,
                level: mode,
            };
            rocketShotResult(data, dispatch, history);
        };
        return () => {
            if (window.onRocketShotMiss) window.onRocketShotMiss = undefined;
        };
    }, [amount, mode, dispatch, history, unlockShooting]);

    // Win handler: same pattern as miss — unlock first, then persist result (onJavelinShotEnd still runs after; idempotent).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.onJavelinWin = (multiplier) => {
            unlockShooting();
            const data = {
                isWin: true,
                betAmount: parseFloat(amount),
                multiplier,
                level: mode,
            };
            rocketShotResult(data, dispatch, history);
        };
        return () => {
            if (window.onJavelinWin) window.onJavelinWin = undefined;
        };
    }, [amount, mode, dispatch, history, unlockShooting]);

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="85vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={isNarrowLayout ? '"game" "empty"' : '"game empty"'}
                templateColumns={isNarrowLayout ? '1fr' : '6fr 2fr'}
                templateRows={isNarrowLayout ? 'auto auto' : 'minmax(0, 1fr)'}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
                alignItems="stretch"
                minH={{ base: 'auto', xl: 'min(920px, calc(100vh - 112px))' }}
            >
                {/* Center - Main Javelin Game */}
                <GridItem area="game" display="flex" flexDirection="column" minH={{ base: 'auto', xl: 0 }}>
                    <Card
                        flex="1"
                        minH="0"
                        w="100%"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                        alignItems="stretch"
                    >
                        <CardBody
                            w="100%"
                            p="0"
                            display="flex"
                            flexDirection="column"
                            flex="1"
                            minH="0"
                            overflow="hidden"
                        >
                            {/* Phaser fills remaining space above controls (no extra “dead” card footer) */}
                            <Box
                                w="100%"
                                flex="1"
                                minH={{ base: '260px', sm: '300px', md: '320px' }}
                                minW={0}
                                position="relative"
                            >
                                <JavelinGame mode={mode} />
                            </Box>

                            {/* Bottom controls */}
                            <Box
                                w="100%"
                                flexShrink={0}
                                pt="12px"
                                pb="14px"
                                position="relative"
                                bg="linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 100%)"
                                borderTop="1px solid rgba(0, 212, 255, 0.3)"
                            >
                                <IconButton
                                    aria-label="Help"
                                    position="absolute"
                                    top="5px"
                                    right="5px"
                                    icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                    size="sm"
                                    variant="ghost"
                                    color="#00d4ff"
                                    _hover={{ bg: 'rgba(255,255,255,0.08)', color: '#00D4FF' }}
                                    onClick={() => setIsHelpModalOpen(true)}
                                />
                                <HStack justify="center" align="center" w="100%">
                                    <VStack spacing="16px" align="center" px="16px">
                                        {/* Bet amount — Dove Cross style: Min | [− value +] | Max */}
                                        <Flex align="center" justify="center" gap="6px" flexWrap="wrap" w="100%">
                                            <Button
                                                size="sm"
                                                h="32px"
                                                minW="44px"
                                                px="10px"
                                                fontSize="xs"
                                                fontWeight="bold"
                                                bg="rgba(0, 212, 255, 0.2)"
                                                color="#00D4FF"
                                                border="1px solid rgba(0, 212, 255, 0.5)"
                                                borderRadius="8px"
                                                _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                                onClick={() => setAmount(MIN_AMOUNT)}
                                            >
                                                Min
                                            </Button>
                                            <HStack
                                                spacing="4px"
                                                bg="#323738"
                                                borderRadius="8px"
                                                px="6px"
                                                h="36px"
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
                                                    onClick={() => setAmount(amount - AMOUNT_STEP)}
                                                    isDisabled={amount - AMOUNT_STEP < MIN_AMOUNT}
                                                />
                                                <Input
                                                    type="number"
                                                    value={amount}
                                                    onChange={handleAmountChange}
                                                    min={MIN_AMOUNT}
                                                    max={maxAmount}
                                                    step={AMOUNT_STEP}
                                                    w={{ base: '72px', sm: '80px' }}
                                                    textAlign="center"
                                                    fontSize="md"
                                                    fontWeight="bold"
                                                    color="#fff"
                                                    bg="transparent"
                                                    border="none"
                                                    p="0"
                                                    _focus={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                                                    _hover={{ border: 'none' }}
                                                    sx={{
                                                        MozAppearance: 'textfield',
                                                        '&::-webkit-outer-spin-button': {
                                                            WebkitAppearance: 'none',
                                                            margin: 0,
                                                        },
                                                        '&::-webkit-inner-spin-button': {
                                                            WebkitAppearance: 'none',
                                                            margin: 0,
                                                        },
                                                    }}
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
                                                    onClick={() => setAmount(amount + AMOUNT_STEP)}
                                                    isDisabled={amount + AMOUNT_STEP > maxAmount}
                                                />
                                            </HStack>
                                            <Button
                                                size="sm"
                                                h="32px"
                                                minW="44px"
                                                px="10px"
                                                fontSize="xs"
                                                fontWeight="bold"
                                                bg="rgba(0, 212, 255, 0.2)"
                                                color="#00D4FF"
                                                border="1px solid rgba(0, 212, 255, 0.5)"
                                                borderRadius="8px"
                                                _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                                onClick={() => setAmount(maxAmount)}
                                            >
                                                Max
                                            </Button>
                                        </Flex>

                                        <HStack spacing="10px" align="center" flexWrap="wrap" justify="center" w="100%">
                                            <HStack spacing="6px" align="center">
                                                <Text as="span" fontSize="xs" color="rgba(255,255,255,0.8)" whiteSpace="nowrap">
                                                    Difficulty:
                                                </Text>
                                                <Select
                                                    size="sm"
                                                    w={{ base: "100px", sm: "110px" }}
                                                    h="32px"
                                                    fontSize="xs"
                                                    bg="#323738"
                                                    color="#fff"
                                                    borderColor="rgba(0, 212, 255, 0.3)"
                                                    borderRadius="6px"
                                                    value={mode}
                                                    onChange={(e) => setMode(e.target.value)}
                                                    sx={{ option: { bg: "#323738", color: "#fff" } }}
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="hard">Hard</option>
                                                </Select>
                                            </HStack>

                                            <HStack
                                                spacing="0"
                                                bg="#323738"
                                                borderRadius="6px"
                                                p="2px"
                                                border="1px solid rgba(0, 212, 255, 0.2)"
                                            >
                                                <Button
                                                    size="xs"
                                                    h="26px"
                                                    px="10px"
                                                    fontSize="xs"
                                                    fontWeight="bold"
                                                    bg={winMode === "flat" ? "#00D4FF" : "transparent"}
                                                    color={winMode === "flat" ? "#000" : "#fff"}
                                                    borderRadius="4px"
                                                    _hover={{
                                                        bg: winMode === "flat" ? "#00D4FF" : "rgba(255,255,255,0.1)",
                                                    }}
                                                    onClick={() => setWinMode("flat")}
                                                >
                                                    Flat Win
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    h="26px"
                                                    px="10px"
                                                    fontSize="xs"
                                                    fontWeight="bold"
                                                    bg={winMode === "multiplier" ? "#00D4FF" : "transparent"}
                                                    color={winMode === "multiplier" ? "#000" : "#fff"}
                                                    borderRadius="4px"
                                                    _hover={{
                                                        bg: winMode === "multiplier" ? "#00D4FF" : "rgba(255,255,255,0.1)",
                                                    }}
                                                    onClick={() => setWinMode("multiplier")}
                                                >
                                                    Multiplier
                                                </Button>
                                            </HStack>
                                        </HStack>

                                    </VStack>
                                    <Button
                                        h="66px"
                                        w="100%"
                                        maxW="280px"       // slightly smaller so "FIRE" looks centered
                                        fontSize="xl"      // bigger font for impact
                                        fontWeight="extrabold"
                                        letterSpacing="1.5px"
                                        borderRadius="30px"  // rounder pill shape
                                        bg="linear-gradient(90deg, #00D4FF, #00AFFF)"  // subtle gradient
                                        color="#FFFFFF"
                                        border="2px solid #00D4FF"
                                        textTransform="uppercase"
                                        _hover={{
                                            bg: "linear-gradient(90deg, #00F0FF, #00BFFF)",
                                            borderColor: "#00F0FF",
                                            transform: "translateY(-3px)",
                                            boxShadow: "0 8px 20px rgba(0, 212, 255, 0.5)",
                                        }}
                                        _active={{
                                            transform: "translateY(0)",
                                            boxShadow: "0 4px 8px rgba(0, 212, 255, 0.3)",
                                        }}
                                        _disabled={{
                                            bg: "#00D4FF80",      // slightly faded
                                            borderColor: "#00D4FF80",
                                            cursor: "not-allowed",
                                            boxShadow: "none",
                                        }}
                                        isDisabled={
                                            isFireCooldown ||
                                            isFiring ||
                                            isBetPending ||
                                            amount < MIN_AMOUNT ||
                                            amount > maxAmount ||
                                            (amount > walletBalanceNum)
                                        }
                                        title={
                                            amount < MIN_AMOUNT
                                            ? `Enter at least ${MIN_AMOUNT}`
                                            : amount > maxAmount
                                            ? `Max bet is ${maxAmount}`
                                            : ""
                                        }
                                        onClick={() => {
                                            handleRocketBet(parseFloat(amount), mode, winMode);
                                        }}
                                        >
                                        FIRE
                                        </Button>
                                </HStack>
                            </Box>
                        </CardBody>
                    </Card>
                </GridItem>
                {/* Right Side - History (same row height as game on xl+) */}
                <GridItem area="empty" display="flex" flexDirection="column" minH={{ base: 'auto', xl: 0 }}>
                    <Box flex="1" minH={{ base: '280px', xl: 0 }} display="flex" flexDirection="column">
                        <RealView />
                    </Box>
                </GridItem>
            </Grid>
            <History />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader
                        color="white"
                        display="flex"
                        alignItems="center"
                    >
                         How to Play Rocket Shot
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                     Step into the action and test your timing in Rocket Shot!
                                </Text>
                                <Text mb={1}>
                                     -The rocket swings back and forth in a smooth semicircle.
                                </Text>
                                <Text mb={1}>
                                     -Watch closely and time your move carefully.
                                </Text>
                                <Text mb={1}>
                                     -Press the FIRE button to launch the rocket into space.
                                </Text>
                                <Text mb={1}>
                                     - Aim to hit one of the targets above the rocket.
                                </Text>
                                <Text mb={1}>
                                     - If you hit the rocket, you will win the multiplier. (min 0.1x - max 10x)
                                </Text>
                                <Text mb={1}>
                                     - The faster the rocket moves, the harder it is to hit high multipliers — but that’s where the big rewards are.
                                </Text>

                                <Text mb={1}>
                                    - In normal mode winingAmount is 110% of easy mode. In hard mode it is 120% of easy mode. But the speed is more fast.
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}