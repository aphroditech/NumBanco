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
    useMediaQuery,
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
const AMOUNT_STEP = 1;
/** Float tolerance for bet min / max checks (avoids 0.499999… disabling Fire). */

/**
 * Phaser may not be ready on the same tick the bet API returns (scene boot, pad respawn, etc.).
 * Retry fire across a few animation frames so the rocket actually launches reliably.
 */
async function fireJavelinWhenReady(maxFrames = 40) {
    for (let i = 0; i < maxFrames; i += 1) {
        if (typeof window !== 'undefined' && typeof window.fireJavelin === 'function') {
            try {
                if (window.fireJavelin() === true) return true;
            } catch (e) {
                console.error(e);
            }
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
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
    const [isFiring, setIsFiring] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [mode, setMode] = useState("easy");
    /** "flat" = flat win display, "multiplier" = multiplier display (UI; extend payout logic if needed) */
    const [winMode, setWinMode] = useState("multiplier");
    const firingLockRef = useRef(false);

    const user = useSelector((state) => state.user.userInfo) || {};
    const walletBalance = user.balance;
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, walletBalance));
    const [isNarrowLayout] = useMediaQuery("(max-width: 1799px)");

    const handleAmountChange = (e) => {
        const raw = e.target.value;
        const v = parseFloat(raw);
        if(v >= MIN_AMOUNT && v <= maxAmount) {
            setAmount(v);
        }
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
                const fired = await fireJavelinWhenReady();
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
            if (walletBalance < bet) return;
            handleRocketBet(bet, mode, winMode);
        };

        window.onRocketShotBet = tryFireFromCanvas;
        return () => {
            if (window.onRocketShotBet === tryFireFromCanvas) window.onRocketShotBet = undefined;
        };
    }, [amount, mode, winMode, maxAmount, walletBalance]);

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
                templateAreas={isNarrowLayout ? '"game" "empty"' : '"game empty"'}
                templateColumns={isNarrowLayout ? '1fr' : '6fr 2fr'}
                templateRows={isNarrowLayout ? 'auto auto' : 'auto'}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
            >
                {/* Center - Main Javelin Game */}
                <GridItem area="game" minH={{ base: "auto", md: "auto" }}>
                    <Card  minH="100%" alignItems="center"  w="100%">
                        <CardBody w="100%" p="0" display="flex" flexDirection="column" >    
                            <Box
                                w="100%"
                                minW={0}
                                minH={{ base: "260px", sm: "320px", md: "380px" }}
                                maxH={{ base: "52vh", md: "66vh" }}
                                h="auto"
                                style={{ aspectRatio: "16 / 9" }}
                            >
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
                                        isDisabled={isFiring || amount < MIN_AMOUNT || amount > maxAmount || amount > walletBalance }
                                        title={
                                            amount < MIN_AMOUNT
                                                ? `Enter at least ${MIN_AMOUNT}`
                                                : amount > maxAmount
                                                  ? `Max bet is ${maxAmount}`
                                                  : ''
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
                        <Box position="absolute" bottom="20px" right="20px" zIndex={2}>
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