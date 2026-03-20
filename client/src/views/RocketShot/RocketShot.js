import React, { useEffect, useRef, useState } from 'react';
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
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader.js';
import CardBody from 'components/Card/CardBody.js';
import { useSelector, useDispatch } from 'react-redux';
import { rocketBet, rocketShotResult } from 'action/RocketActions';

import RealView from './RocketItems/RealView';
import Loading from 'components/Loading/Loading';
import JavelinGame from './JavelinGame';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useHistory } from 'react-router-dom';

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
/** Match Dove Cross step increments for +/- controls */
const AMOUNT_STEP = 0.1;
/** Float tolerance for bet min / max checks (avoids 0.499999… disabling Fire). */
const BET_EPS = 1e-6;

/**
 * Redux `user.balance` may be missing while the navbar still shows stale digits, or come back as a string.
 * When unknown, don't coerce to 0 (that makes `balance >= bet` false and locks Fire forever).
 */
function getWalletBalanceInfo(user) {
    const raw = user?.balance;
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return { balance: raw, known: true };
    }
    if (typeof raw === "string") {
        const cleaned = raw.replace(/,/g, "").trim();
        if (cleaned === "") return { balance: 0, known: false };
        const n = parseFloat(cleaned);
        if (Number.isFinite(n)) return { balance: n, known: true };
    }
    return { balance: 0, known: false };
}

export default function RocketShotPage() {
    const dispatch = useDispatch();
    const history = useHistory();

    const [amount, setAmount] = useState('0.5');
    const [isFiring, setIsFiring] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [mode, setMode] = useState("easy");
    /** "flat" = flat win display, "multiplier" = multiplier display (UI; extend payout logic if needed) */
    const [winMode, setWinMode] = useState("multiplier");
    const firingLockRef = useRef(false);

    const user = useSelector((state) => state.user.userInfo) || {};
    const { balance: walletBalance, known: balanceKnown } = getWalletBalanceInfo(user);
    const maxAmount = balanceKnown
        ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, walletBalance))
        : MAX_AMOUNT;
    const betNum = parseFloat(String(amount ?? "").trim());
    const betValid =
        Number.isFinite(betNum) &&
        betNum + BET_EPS >= MIN_AMOUNT &&
        betNum <= maxAmount + BET_EPS &&
        (!balanceKnown || walletBalance + BET_EPS >= betNum);

    const currentAmount = Number.isFinite(parseFloat(String(amount))) ? parseFloat(String(amount)) : MIN_AMOUNT;

    const setClampedAmount = (val) => {
        const v = Math.max(MIN_AMOUNT, Math.min(maxAmount, val));
        setAmount(v.toFixed(1));
    };

    const handleAmountChange = (e) => {
        const raw = e.target.value;
        const v = parseFloat(raw);
        if (!Number.isNaN(v)) {
            setClampedAmount(v);
        } else {
            setAmount(raw);
        }
    };

    const handleAmountBlur = () => {
        const n = parseFloat(String(amount));
        if (Number.isNaN(n) || n < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(1));
        else if (n > maxAmount) setAmount(maxAmount.toFixed(1));
        else setAmount(n.toFixed(1));
    };

    const handleRocketBet = async (amount, mode, selectedWinMode) => {
        if (firingLockRef.current) return;
        firingLockRef.current = true;
        setIsFiring(true);

        // Used by Phaser scene to display the correct win label for this specific shot.
        if (typeof window !== 'undefined') {
            window.__rocketPendingBetAmount = parseFloat(amount);
            window.__rocketPendingWinMode = selectedWinMode;
        }
        try {
            const multiplier = await rocketBet({ bet: parseFloat(amount), level: mode }, dispatch, history);
            // Store multiplier for the current shot.
            // `GameScene.hitTarget()` will display this value only if the shot hits.
            if (typeof window !== 'undefined') {
                window.__rocketPendingMultiplier = multiplier;
            }
            if (typeof window !== 'undefined' && typeof window.fireJavelin === 'function') {
                const fired = window.fireJavelin();
                // If Phaser didn't start a shot, unlock immediately (avoids Fire stuck disabled).
                if (!fired) {
                    window.__rocketPendingMultiplier = null;
                    window.__rocketPendingWinMode = null;
                    window.__rocketPendingBetAmount = null;
                    setIsFiring(false);
                    firingLockRef.current = false;
                }
            } else {
                if (typeof window !== 'undefined') window.__rocketPendingMultiplier = null;
                if (typeof window !== 'undefined') window.__rocketPendingWinMode = null;
                if (typeof window !== 'undefined') window.__rocketPendingBetAmount = null;
                setIsFiring(false);
                firingLockRef.current = false;
            }
        } catch (error) {
            console.error(error);
            if (typeof window !== 'undefined') window.__rocketPendingMultiplier = null;
            if (typeof window !== 'undefined') window.__rocketPendingWinMode = null;
            if (typeof window !== 'undefined') window.__rocketPendingBetAmount = null;
            setIsFiring(false);
            firingLockRef.current = false;
        }
    }

    // Never leave the page stuck from a prior session / failed Phaser handoff.
    useEffect(() => {
        setIsFiring(false);
        firingLockRef.current = false;
    }, []);

    // If Phaser never calls onJavelinShotEnd (edge case), unlock so the user can play again.
    useEffect(() => {
        if (!isFiring) return;
        const failSafe = window.setTimeout(() => {
            firingLockRef.current = false;
            setIsFiring(false);
        }, 45000);
        return () => window.clearTimeout(failSafe);
    }, [isFiring]);

    // Unlock the Fire button only when the current rocket shot is fully done
    // (hit or miss). This prevents overwriting the pending multiplier.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => {
            firingLockRef.current = false;
            setIsFiring(false);
        };
        window.onJavelinShotEnd = handler;
        return () => {
            if (window.onJavelinShotEnd === handler) window.onJavelinShotEnd = undefined;
        };
    }, []);

    // Allow firing by clicking the rocket/launch pad inside the Phaser canvas.
    useEffect(() => {
        if (typeof window === "undefined") return;

        const tryFireFromCanvas = () => {
            if (firingLockRef.current) return;
            const bet = parseFloat(amount);
            if (Number.isNaN(bet) || bet < MIN_AMOUNT) return;
            if (bet > maxAmount) return;
            if (balanceKnown && walletBalance < bet) return;
            handleRocketBet(bet, mode, winMode);
        };

        window.onRocketShotBet = tryFireFromCanvas;
        return () => {
            if (window.onRocketShotBet === tryFireFromCanvas) window.onRocketShotBet = undefined;
        };
    }, [amount, mode, winMode, maxAmount, walletBalance, balanceKnown]);

    // Handle rocket shot miss
    window.onRocketShotMiss = () => {
        const data = {
            isWin: false,
            betAmount: parseFloat(amount),
            multiplier: 0,
            level: mode,
        };
        rocketShotResult(data, dispatch, history);
    };

    window.onJavelinWin = (multiplier) => {
        const data = {
            isWin: true,
            betAmount: parseFloat(amount),
            multiplier: multiplier,
            level: mode,
        };
        rocketShotResult(data, dispatch, history);
    };

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="90vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"game" "empty"',
                    md: '"game empty"',
                    '1550px': '"game empty"'
                }}
                templateColumns={{
                    sm: '1fr',
                    md: '6fr 2fr',
                    '1550px': '6fr 2fr'
                }}
                templateRows={{
                    base: 'auto auto',
                    md: 'auto',
                    '1550px': 'auto'
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
            >
                {/* Center - Main Javelin Game */}
                <GridItem area="game" minH={'450px'}>
                    <Card  minH="100%" alignItems="center"  w="100%">
                        <CardHeader>
                            <Box position="absolute" top="13px" right="13px" zIndex={2}>
                                <IconButton
                                    aria-label="Help"
                                    icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                                    size="md"
                                    bg="transparent"
                                    color="#00d4ff"
                                    borderRadius="50%"
                                    _hover={{ bg: 'rgba(255,255,255,0.1)', color: '#00D4FF' }}
                                    onClick={() => setIsHelpModalOpen(true)}
                                />
                            </Box>
                        </CardHeader>
                        <CardBody w="100%" p="0" display="flex" flexDirection="column" >    
                            <Box  w="100%" minH="600px">
                                <JavelinGame mode={mode}/>
                            </Box>

                            {/* Bottom controls moved from the left panel */}
                            <Box
                                w="100%"
                                pt="12px"
                                pb="14px"
                                bg="linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 100%)"
                                borderTop="1px solid rgba(0, 212, 255, 0.3)"
                            >
                                <VStack spacing="16px" align="center" w="100%" maxW="560px" mx="auto" px="16px">
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
                                            onClick={() => setClampedAmount(MIN_AMOUNT)}
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
                                                onClick={() => setClampedAmount(currentAmount - AMOUNT_STEP)}
                                                isDisabled={currentAmount <= MIN_AMOUNT + BET_EPS}
                                            />
                                            <Input
                                                type="number"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
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
                                                onClick={() => setClampedAmount(currentAmount + AMOUNT_STEP)}
                                                isDisabled={currentAmount >= maxAmount - BET_EPS}
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
                                            onClick={() => setClampedAmount(maxAmount)}
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

                                    <Button
                                        h="36px"
                                        w="100%"
                                        maxW="300px"
                                        fontSize="md"
                                        fontWeight="bold"
                                        borderRadius="20px"
                                        bg="#00D4FF"
                                        color="#fff"
                                        border="2px solid #00D4FF"
                                        _hover={{
                                            bg: '#00D4FF',
                                            borderColor: '#00D4FF',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
                                        }}
                                        _active={{ transform: 'translateY(0)' }}
                                        isDisabled={!betValid || isFiring}
                                        title={
                                            !betValid && !isFiring
                                                ? !Number.isFinite(betNum) || betNum + BET_EPS < MIN_AMOUNT
                                                    ? `Enter at least ${MIN_AMOUNT}`
                                                    : balanceKnown && walletBalance + BET_EPS < betNum
                                                      ? 'Insufficient balance for this bet'
                                                      : betNum > maxAmount + BET_EPS
                                                        ? `Max bet is ${maxAmount.toFixed(2)}`
                                                        : ''
                                                : undefined
                                        }
                                        onClick={() => {
                                            handleRocketBet(parseFloat(amount), mode, winMode);
                                        }}
                                    >
                                        Fire
                                    </Button>
                                </VStack>
                            </Box>
                        </CardBody>
                        
                    </Card>
                </GridItem>
                {/* Right Side - History */}
                <GridItem area="empty">
                    <RealView />
                </GridItem>
            </Grid>
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
                                <Text>
                                     -The rocket swings back and forth in a smooth semicircle.
                                </Text>
                                <Text>
                                     -Watch closely and time your move carefully.
                                </Text>
                                <Text>
                                     -Press the FIRE button to launch the rocket into space.
                                </Text>
                                <Text>
                                     - Aim to hit one of the targets above the rocket.
                                </Text>
                                
                                <Text>
                                     - The faster the rocket moves, the harder it is to hit high multipliers — but that’s where the big rewards are.
                                </Text>
                                
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}