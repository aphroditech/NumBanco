import React, { useRef, useState, useCallback } from 'react';
import Card from 'components/Card/Card.js';
import { VStack, Text, Box, HStack, Image, Button, Flex, Input, IconButton } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import CoinHeadImage from 'assets/img/Coin/head.png';
import CoinTailImage from 'assets/img/Coin/tail.png';
import backgroundImage from "assets/img/Coin/background.jpg";

const MotionImage = motion(Image);
const MotionBox = motion(Box);

const MIN_BET = 0.5;
const MAX_BET = 20;
/** Step for +/- buttons (typed amounts may use up to 2 decimal places). */
const BET_STEP = 0.5;

/** Allow typing only digits and one decimal point; cap fractional part at 2 digits. */
function sanitizeBetDraft(raw) {
    let s = String(raw ?? '').replace(/[^\d.]/g, '');
    if (s.startsWith('.')) s = `0${s}`;
    const dot = s.indexOf('.');
    if (dot === -1) return s;
    const intPart = s.slice(0, dot);
    const dec = s
        .slice(dot + 1)
        .replace(/\./g, '')
        .slice(0, 2);
    return `${intPart}.${dec}`;
}

function formatBetDisplay(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
}

export default function MainGameSection() {
    const amounts = ['0.5', '1', '5', '10', '20'];
    const [coinFace, setCoinFace] = useState('HEADS');
    const [isTossing, setIsTossing] = useState(false);
    const [revealKey, setRevealKey] = useState(0);
    const pendingFaceRef = useRef('HEADS');
    const [betAmount, setBetAmount] = useState(0.5);
    const [betFocused, setBetFocused] = useState(false);
    const [betDraft, setBetDraft] = useState('');

    const clampBet = useCallback((n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return MIN_BET;
        const rounded = Math.round(v * 100) / 100;
        return Math.min(MAX_BET, Math.max(MIN_BET, rounded));
    }, []);

    const commitBetFromDraft = useCallback(() => {
        const parsed = parseFloat(betDraft);
        const n = clampBet(Number.isFinite(parsed) && betDraft.trim() !== '' ? parsed : MIN_BET);
        setBetAmount(n);
        setBetDraft(formatBetDisplay(n));
        setBetFocused(false);
    }, [betDraft, clampBet]);

    const adjustBetByStep = useCallback(
        (delta) => {
            const next = clampBet(betAmount + delta);
            setBetAmount(next);
            if (betFocused) setBetDraft(formatBetDisplay(next));
        },
        [betAmount, betFocused, clampBet]
    );

    const setFromPreset = (amt) => {
        const n = clampBet(Number(amt));
        setBetAmount(n);
        if (betFocused) setBetDraft(formatBetDisplay(n));
    };

    const handleThrowCoin = () => {
        if (isTossing) return;
        setIsTossing(true);
        // Decide result first, reveal it after the toss flip proxy ends.
        pendingFaceRef.current = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    };

    return (
        <Card
            p={{ base: '12px', md: '16px' }}
            minH={{ base: '420px', md: '750px' }}
            h="100%"
            display="flex"
            flexDirection="column"
            // bg="#03070f"
            border="1px solid rgba(0, 212, 255, 0.2)"
            backgroundImage={`url(${backgroundImage})`}
            backgroundSize="cover"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            overflow="hidden"
        >
            <VStack align="stretch" spacing={0} h="100%">
                <Box flex="1" minH="0" position="relative" py={{ base: 6, md: 8 }}>
                    <VStack spacing={{ base: 6, md: 10 }} h="100%" justify="space-between">
                        <HStack spacing={2}>
                            {['#13d8ff', '#13d8ff', '#13d8ff', '#ff3f76', '#13d8ff'].map((c, i) => (
                                <Box
                                    key={i}
                                    w={{ base: '16px', md: '18px' }}
                                    h={{ base: '16px', md: '18px' }}
                                    borderRadius="full"
                                    border="2px solid"
                                    borderColor={c}
                                    boxShadow={`0 0 10px ${c}`}
                                    bg={i === 3 ? 'transparent' : 'rgba(19, 216, 255, 0.1)'}
                                />
                            ))}
                        </HStack>

                        <Box
                            w={{ base: '300px', md: '300px' }}
                            h={{ base: '300px', md: '300px' }}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            position="relative"
                        >
                            {!isTossing && (
                                <MotionImage
                                    key={`${coinFace}-${revealKey}`}
                                    src={coinFace === 'HEADS' ? CoinHeadImage : CoinTailImage}
                                    alt="Coin"
                                    w={{ base: '300px', md: '350px' }}
                                    h={{ base: '300px', md: '350px' }}
                                    objectFit="contain"
                                    filter={`drop-shadow(0 0 10px ${coinFace === 'HEADS' ? '#ff3f76' : '#13d8ff'})`}
                                    initial={{ opacity: 0, scale: 0.78, rotateY: 90 }}
                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                />
                            )}

                            {isTossing && (
                                <MotionBox
                                    w={{ base: '135px', md: '155px' }}
                                    h={{ base: '135px', md: '155px' }}
                                    borderRadius="full"
                                    bg="radial-gradient(circle at 50% 50%, rgba(170,220,255,0.95) 0%, rgba(70,130,180,0.9) 44%, rgba(28,45,69,0.86) 72%, rgba(15,26,44,0.6) 100%)"
                                    border="2px solid rgba(180,230,255,0.6)"
                                    boxShadow="0 0 26px rgba(19,216,255,0.35), inset 0 0 24px rgba(255,255,255,0.22)"
                                    style={{ transformStyle: 'preserve-3d' }}
                                    initial={{ opacity: 1, rotateY: 0, scaleX: 1, scale: 1 }}
                                    animate={{
                                        rotateY: [0, 360, 720, 1080, 1440, 1800],
                                        scaleX: [1, 0.12, 1, 0.12, 1, 0.08, 1],
                                        scale: [1, 0.98, 0.95, 0.98, 1],
                                        opacity: [1, 1, 1, 1, 0.7, 0],
                                    }}
                                    transition={{ duration: 0.85, ease: 'easeInOut', times: [0, 0.18, 0.32, 0.5, 0.7, 1] }}
                                    onAnimationComplete={() => {
                                        setCoinFace(pendingFaceRef.current);
                                        setIsTossing(false);
                                        setRevealKey((v) => v + 1);
                                    }}
                                />
                            )}
                        </Box>

                        <VStack spacing={4} w="100%" maxW="560px" px={{ base: 2, md: 4 }}>
                            <Box w="100%">
                                <Text
                                    fontSize="xs"
                                    fontWeight="700"
                                    letterSpacing="0.12em"
                                    color="rgba(255,255,255,0.45)"
                                    mb={2}
                                    textAlign="center"
                                >
                                    BET AMOUNT
                                </Text>
                                <Flex
                                    align="center"
                                    justify="center"
                                    gap={{ base: '6px', md: '10px' }}
                                    flexWrap="wrap"
                                    w="100%"
                                >
                                    <Button
                                        size="sm"
                                        h={{ base: '46px', md: '52px' }}
                                        minW="52px"
                                        px="10px"
                                        fontSize="xs"
                                        fontWeight="800"
                                        borderRadius="10px"
                                        bg="rgba(15, 56, 66, 0.55)"
                                        color="rgba(23, 219, 255, 0.95)"
                                        border="1px solid rgba(23, 219, 255, 0.45)"
                                        boxShadow="inset 0 0 12px rgba(23, 219, 255, 0.12)"
                                        _hover={{
                                            bg: 'rgba(20, 67, 80, 0.65)',
                                            borderColor: 'rgba(23, 219, 255, 0.65)',
                                        }}
                                        onClick={() => {
                                            const n = clampBet(MIN_BET);
                                            setBetAmount(n);
                                            if (betFocused) setBetDraft(formatBetDisplay(n));
                                        }}
                                        isDisabled={isTossing}
                                    >
                                        Min
                                    </Button>
                                    <HStack
                                        spacing={0}
                                        bg="rgba(5, 12, 22, 0.92)"
                                        borderRadius="14px"
                                        border="1px solid rgba(0, 212, 255, 0.28)"
                                        boxShadow="0 0 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
                                        px={{ base: '4px', md: '6px' }}
                                        h={{ base: '50px', md: '56px' }}
                                        flex="1"
                                        minW="0"
                                        maxW={{ base: '100%', sm: '280px' }}
                                    >
                                        <IconButton
                                            aria-label="Decrease bet"
                                            icon={<RemoveIcon style={{ fontSize: 20 }} />}
                                            size="sm"
                                            h="40px"
                                            w="40px"
                                            minW="40px"
                                            borderRadius="10px"
                                            bg="transparent"
                                            color="rgba(23, 219, 255, 0.9)"
                                            _hover={{ bg: 'rgba(23, 219, 255, 0.12)' }}
                                            onClick={() => adjustBetByStep(-BET_STEP)}
                                            isDisabled={isTossing || betAmount <= MIN_BET - 1e-9}
                                        />
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            value={betFocused ? betDraft : formatBetDisplay(betAmount)}
                                            onChange={(e) => setBetDraft(sanitizeBetDraft(e.target.value))}
                                            onFocus={() => {
                                                setBetFocused(true);
                                                setBetDraft(formatBetDisplay(betAmount));
                                            }}
                                            onBlur={commitBetFromDraft}
                                            flex="1"
                                            minW="72px"
                                            h="100%"
                                            textAlign="center"
                                            fontSize={{ base: 'lg', md: 'xl' }}
                                            fontWeight="800"
                                            fontVariantNumeric="tabular-nums"
                                            color="#fff"
                                            bg="transparent"
                                            border="none"
                                            p="0"
                                            _focus={{ outline: 'none', boxShadow: 'none' }}
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
                                            icon={<AddIcon style={{ fontSize: 20 }} />}
                                            size="sm"
                                            h="40px"
                                            w="40px"
                                            minW="40px"
                                            borderRadius="10px"
                                            bg="transparent"
                                            color="rgba(23, 219, 255, 0.9)"
                                            _hover={{ bg: 'rgba(23, 219, 255, 0.12)' }}
                                            onClick={() => adjustBetByStep(BET_STEP)}
                                            isDisabled={isTossing || betAmount >= MAX_BET - 1e-9}
                                        />
                                    </HStack>
                                    <Button
                                        size="sm"
                                        h={{ base: '46px', md: '52px' }}
                                        minW="52px"
                                        px="10px"
                                        fontSize="xs"
                                        fontWeight="800"
                                        borderRadius="10px"
                                        bg="linear-gradient(180deg, rgba(62,18,27,0.75) 0%, rgba(45,12,23,0.85) 100%)"
                                        color="rgba(255, 228, 236, 0.95)"
                                        border="1px solid rgba(255, 57, 96, 0.5)"
                                        boxShadow="inset 0 0 14px rgba(255, 46, 99, 0.15)"
                                        _hover={{
                                            bg: 'linear-gradient(180deg, rgba(75,22,33,0.85) 0%, rgba(55,16,28,0.92) 100%)',
                                            borderColor: 'rgba(255, 61, 109, 0.65)',
                                        }}
                                        onClick={() => {
                                            const n = clampBet(MAX_BET);
                                            setBetAmount(n);
                                            if (betFocused) setBetDraft(formatBetDisplay(n));
                                        }}
                                        isDisabled={isTossing}
                                    >
                                        Max
                                    </Button>
                                </Flex>
                            </Box>

                            <HStack spacing={{ base: 2, md: 2.5 }} justify="center" w="100%" flexWrap="wrap">
                                {amounts.map((amt) => {
                                    const active = Math.abs(betAmount - Number(amt)) < 0.005;
                                    return (
                                        <Button
                                            key={amt}
                                            flex="1"
                                            minW="58px"
                                            maxW="88px"
                                            h={{ base: '42px', md: '48px' }}
                                            borderRadius="md"
                                            variant="unstyled"
                                            border="1px solid"
                                            borderColor={
                                                active
                                                    ? 'rgba(23, 219, 255, 0.65)'
                                                    : 'rgba(255,255,255,0.12)'
                                            }
                                            bg={
                                                active
                                                    ? 'linear-gradient(180deg, rgba(15,56,66) 0%, rgba(8,32,42) 100%)'
                                                    : 'rgba(3, 8, 16)'
                                            }
                                            boxShadow={
                                                active
                                                    ? '0 0 16px rgba(23, 219, 255, 0.25), inset 0 0 12px rgba(23, 219, 255, 0.08)'
                                                    : 'none'
                                            }
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            isDisabled={isTossing}
                                            onClick={() => setFromPreset(amt)}
                                            _hover={{
                                                borderColor: 'rgba(23, 219, 255, 0.45)',
                                                bg: 'rgba(12, 28, 38, 0.9)',
                                            }}
                                        >
                                            <Text
                                                color={
                                                    active
                                                        ? 'rgba(190, 245, 255, 0.98)'
                                                        : 'rgba(255,255,255,0.5)'
                                                }
                                                fontWeight="800"
                                                fontSize="sm"
                                            >
                                                {amt}
                                            </Text>
                                        </Button>
                                    );
                                })}
                            </HStack>

                            <Flex gap={{ base: 3, md: 4 }} w="100%">
                                <Button
                                    flex="1"
                                    h={{ base: '48px', md: '56px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(180deg, rgba(62,18,27,0.92) 0%, rgba(45,12,23,0.96) 100%)"
                                    color="rgba(255,255,255,0.92)"
                                    border="2px solid rgba(255, 57, 96, 0.55)"
                                    fontSize={{ base: 'xl', md: '2xl' }}
                                    fontWeight="900"
                                    letterSpacing="0.02em"
                                    boxShadow="0 0 0 1px rgba(255, 61, 109, 0.35), inset 0 0 18px rgba(255, 46, 99, 0.2), 0 0 18px rgba(255, 46, 99, 0.35)"
                                    _hover={{
                                        bg: 'linear-gradient(180deg, rgba(75,22,33,0.96) 0%, rgba(55,16,28,0.98) 100%)',
                                        boxShadow: '0 0 0 1px rgba(255, 61, 109, 0.45), inset 0 0 24px rgba(255, 46, 99, 0.28), 0 0 24px rgba(255, 46, 99, 0.45)',
                                        transform: 'translateY(-1px)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    isDisabled={isTossing}
                                    onClick={handleThrowCoin}
                                >
                                    HEADS
                                </Button>
                                <Button
                                    flex="1"
                                    h={{ base: '48px', md: '56px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(180deg, rgba(15,56,66,0.92) 0%, rgba(10,41,54,0.96) 100%)"
                                    color="rgba(255,255,255,0.92)"
                                    border="2px solid rgba(23, 219, 255, 0.58)"
                                    fontSize={{ base: 'xl', md: '2xl' }}
                                    fontWeight="900"
                                    letterSpacing="0.02em"
                                    boxShadow="0 0 0 1px rgba(23, 219, 255, 0.35), inset 0 0 20px rgba(23, 219, 255, 0.2), 0 0 20px rgba(23, 219, 255, 0.32)"
                                    _hover={{
                                        bg: 'linear-gradient(180deg, rgba(20,67,80,0.96) 0%, rgba(14,50,64,0.98) 100%)',
                                        boxShadow: '0 0 0 1px rgba(23, 219, 255, 0.45), inset 0 0 26px rgba(23, 219, 255, 0.28), 0 0 28px rgba(23, 219, 255, 0.42)',
                                        transform: 'translateY(-1px)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    isDisabled={isTossing}
                                    onClick={handleThrowCoin}
                                >
                                    TAILS
                                </Button>
                            </Flex>
                        </VStack>
                    </VStack>
                </Box>
            </VStack>
        </Card>
    );
}   