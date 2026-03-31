import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import {
    Box,
    Grid,
    GridItem,
    FormControl,
    FormLabel,
    Input,
    Flex,
    VStack,
    HStack,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
} from "@chakra-ui/react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ClickButton from "components/Input/ClickButton";
import GradientBorder from "components/GradientBorder/GradientBorder";
import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";
import CardHeader from "components/Card/CardHeader.js";
import BangBurstEffect from "components/Effects/BangBurstEffect";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import TarotBetHistory from "./TarotItem/TarotBetHistory";
import TarotRealView from "./TarotItem/TarotRealView";
import { tarotPlay } from "action/TarotActions";
import { setNotification } from "utils/localStorage";
import { onlineUser, offlineUser } from "action/BetActions";

const publicUrl = process.env.PUBLIC_URL || "";
const backcard = `${publicUrl}/tarot/back_card.png`;
const frontendBase = `${publicUrl}/tarot/base.png`;
const frontendLeft = `${publicUrl}/tarot/left.png`;
const frontendRight = `${publicUrl}/tarot/right.png`;

const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 20;
const REVEAL_STEP_MS = 700;
const REVEAL_INITIAL_MS = 350;
/** Hold Live Results Ably refresh until after last card + short buffer (like Diamond). */
const TAROT_REVEAL_POST_ANIM_MS = 520;
/** Count-up duration for the total-multi box per phase (center → left → right). */
const MULT_COUNTUP_MS = 620;
/** Back → front art crossfade / scale on card reveal. */
const CARD_REVEAL_MS = 620;
const CARD_REVEAL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TAROT_WIN_FIREWORKS_MS = 2200;
const TAROT_BANG_EFFECT_MS = 950;

function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
}

/**
 * @param {number} from
 * @param {number} to
 * @param {number} durationMs
 * @param {(v: number) => void} onUpdate
 * @param {() => void} [onDone]
 * @returns {() => void} cancel
 */
function runMultCountup(from, to, durationMs, onUpdate, onDone) {
    const t0 = performance.now();
    let raf = 0;
    const step = (now) => {
        const u = Math.min(1, (now - t0) / durationMs);
        const v = from + (to - from) * easeOutCubic(u);
        onUpdate(v);
        if (u < 1) raf = requestAnimationFrame(step);
        else {
            onUpdate(to);
            onDone?.();
        }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
}

function formatMult(v) {
    if (!Number.isFinite(v)) return "—";
    const t = Number(v.toFixed(4));
    return String(t);
}

/** Total-multi box: fixed 2 decimals (e.g. 3.20). */
function formatTotalMultDisplay(v) {
    if (!Number.isFinite(v)) return "—";
    return v.toFixed(2);
}

const TAROT_PANEL_MIN_H = { base: "auto", md: "360px" };
const TAROT_MAIN_CARD_MIN_H = { base: "auto", md: "min(520px, 88vh)" };

const cardLayerTransition = (active) =>
    active ? `opacity ${CARD_REVEAL_MS}ms ${CARD_REVEAL_EASE}, transform ${CARD_REVEAL_MS}ms ${CARD_REVEAL_EASE}` : "none";

/** @param {{ value: number, ratePct: number } | null} face @param {string} frontSrc */
function TarotSlotCard({ face, isCenter, backSrc, frontSrc }) {
    const showFront = face != null;
    return (
        <Box
            role="img"
            aria-label={showFront ? `Tarot card ${formatMult(face.value)}×` : "Tarot card back"}
            borderRadius="14px"
            overflow="hidden"
            border="none"
            boxShadow="none"
            bg="transparent"
            sx={{ aspectRatio: "5 / 7" }}
            position="relative"
        >
            <Box
                position="absolute"
                inset={0}
                transition={cardLayerTransition(showFront)}
                opacity={showFront ? 0 : 1}
                transform={showFront ? "scale(0.94)" : "scale(1)"}
                pointerEvents={showFront ? "none" : "auto"}
            >
                <Box
                    as="img"
                    src={backSrc}
                    alt=""
                    w="100%"
                    h="100%"
                    objectFit="contain"
                    objectPosition="center"
                    display="block"
                    draggable={false}
                />
            </Box>
            <Box
                position="absolute"
                inset={0}
                transition={cardLayerTransition(showFront)}
                opacity={showFront ? 1 : 0}
                transform={showFront ? "scale(1)" : "scale(0.94)"}
                pointerEvents={showFront ? "auto" : "none"}
            >
                <Box
                    as="img"
                    src={frontSrc}
                    alt=""
                    w="100%"
                    h="100%"
                    objectFit="contain"
                    objectPosition="center"
                    display="block"
                    draggable={false}
                />
                {showFront && face ? (
                    <Flex
                        direction="column"
                        align="center"
                        justify="flex-end"
                        position="absolute"
                        inset={0}
                        pt="38%"
                        pb={{ base: 2, md: 2.5 }}
                        px={{ base: 1.5, md: 2 }}
                            bg="linear-gradient(180deg, transparent 0%, rgba(8,10,14,0.38) 65%, rgba(6,8,12,0.52) 100%)"
                        pointerEvents="none"
                    >
                        <Text
                            fontSize={{ base: "lg", md: "xl" }}
                            fontWeight="800"
                            color="#00D4FF"
                            fontVariantNumeric="tabular-nums"
                            lineHeight="1.1"
                            textShadow="0 1px 12px rgba(0,0,0,0.85)"
                        >
                            {formatMult(face.value)}×
                        </Text>
                        <Text
                            mt={1}
                            fontSize="9px"
                            fontWeight="700"
                            color="rgba(255,255,255,0.45)"
                            letterSpacing="0.12em"
                            textTransform="uppercase"
                        >
                            {isCenter ? "Base" : "Side"}
                        </Text>
                    </Flex>
                ) : null}
            </Box>
        </Box>
    );
}

export default function TarotPage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);

    const [amount, setAmount] = useState("0.10");
    const [playLoading, setPlayLoading] = useState(false);
    /** @type {[null | { value: number, ratePct: number }, Function]} */
    const [leftFace, setLeftFace] = useState(null);
    const [centerFace, setCenterFace] = useState(null);
    const [rightFace, setRightFace] = useState(null);
    const [totalMult, setTotalMult] = useState(null);
    /** Box display value; animates 0 → base → base×left → product while revealing. */
    const [shownMult, setShownMult] = useState(0);
    const [showWinFireworks, setShowWinFireworks] = useState(false);
    const [showBangEffect, setShowBangEffect] = useState(false);
    const [winFireworksAmount, setWinFireworksAmount] = useState("0.00");
    const [winFireworksSubtitle, setWinFireworksSubtitle] = useState("");
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [tarotLiveSuppressUntil, setTarotLiveSuppressUntil] = useState(0);

    const revealTimeoutsRef = useRef([]);
    const multCountupCancelRef = useRef(null);
    const winFireworksTimerRef = useRef(null);
    const bangEffectTimerRef = useRef(null);
    const betAmountInputRef = useRef(null);

    const amountNum = Number(amount || 0);
    const canDecrease = amountNum > MIN_AMOUNT + 1e-9;
    const canIncrease = amountNum < MAX_AMOUNT - 1e-9;

    const clampAmount = (v) => {
        if (!Number.isFinite(v)) return MIN_AMOUNT;
        return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, v));
    };

    const commitAmount = (v) => setAmount(clampAmount(v).toFixed(2));

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === "") {
            setAmount("");
            return;
        }
        if (/^\d*\.?\d{0,2}$/.test(value)) setAmount(value);
    };

    const handleAmountBlur = () => commitAmount(Number(amount));

    const clearRevealTimers = () => {
        revealTimeoutsRef.current.forEach((id) => clearTimeout(id));
        revealTimeoutsRef.current = [];
        if (typeof multCountupCancelRef.current === "function") {
            multCountupCancelRef.current();
            multCountupCancelRef.current = null;
        }
        if (winFireworksTimerRef.current) {
            clearTimeout(winFireworksTimerRef.current);
            winFireworksTimerRef.current = null;
        }
        if (bangEffectTimerRef.current) {
            clearTimeout(bangEffectTimerRef.current);
            bangEffectTimerRef.current = null;
        }
        setShowWinFireworks(false);
        setShowBangEffect(false);
    };

    useEffect(() => () => clearRevealTimers(), []);

    const handleDraw = async () => {
        const bet = Number(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT || bet > MAX_AMOUNT) {
            toast.error(`Enter amount between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
            return;
        }
        if (bet > balance + 1e-9) {
            toast.error("Insufficient balance");
            return;
        }

        clearRevealTimers();
        setPlayLoading(true);
        setLeftFace(null);
        setCenterFace(null);
        setRightFace(null);
        setTotalMult(null);
        setShownMult(0);

        let data;
        try {
            data = await tarotPlay({ betAmount: bet }, dispatch, history);
        } catch (err) {
            setPlayLoading(false);
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Round failed";
            toast.error(msg);
            return;
        }

        const t = data?.tarot;
        if (!t?.base || !t?.left || !t?.right || !Number.isFinite(Number(t.totalMult))) {
            setPlayLoading(false);
            toast.error("Invalid round from server");
            return;
        }

        const baseFace = {
            value: Number(t.base.value),
            ratePct: Number(t.base.ratePct),
        };
        const leftFaceData = {
            value: Number(t.left.value),
            ratePct: Number(t.left.ratePct),
        };
        const rightFaceData = {
            value: Number(t.right.value),
            ratePct: Number(t.right.ratePct),
        };
        const product = Number(t.totalMult);
        const win = Number(t.win ?? bet * product);
        const b = baseFace.value;
        const l = leftFaceData.value;
        const r = rightFaceData.value;
        const afterBase = b * l;
        const afterRight = afterBase * r;

        setTarotLiveSuppressUntil(
            Date.now() + REVEAL_INITIAL_MS + 4 * REVEAL_STEP_MS + TAROT_REVEAL_POST_ANIM_MS
        );

        const startCountup = (from, to) => {
            if (typeof multCountupCancelRef.current === "function") {
                multCountupCancelRef.current();
            }
            multCountupCancelRef.current = runMultCountup(
                from,
                to,
                MULT_COUNTUP_MS,
                (v) => setShownMult(v),
                () => {
                    multCountupCancelRef.current = null;
                }
            );
        };

        let delay = REVEAL_INITIAL_MS;
        revealTimeoutsRef.current.push(
            window.setTimeout(() => {
                setCenterFace(baseFace);
                startCountup(0, b);
            }, delay)
        );
        delay += REVEAL_STEP_MS;

        revealTimeoutsRef.current.push(
            window.setTimeout(() => {
                setLeftFace(leftFaceData);
                startCountup(b, afterBase);
            }, delay)
        );
        delay += REVEAL_STEP_MS;

        revealTimeoutsRef.current.push(
            window.setTimeout(() => {
                setRightFace(rightFaceData);
                startCountup(afterBase, afterRight);
            }, delay)
        );
        delay += REVEAL_STEP_MS;

        revealTimeoutsRef.current.push(
            window.setTimeout(() => {
                setTotalMult(product);
                setShownMult(product);
                setPlayLoading(false);
                /** Mirror server delayed credit (pumping-style): stake already deducted in Redux from play response. */
                dispatch({ type: "UPDATE_USER_BALANCE", payload: win });
                if (product <= 0) {
                    setShowBangEffect(true);
                    if (bangEffectTimerRef.current) clearTimeout(bangEffectTimerRef.current);
                    bangEffectTimerRef.current = window.setTimeout(() => {
                        setShowBangEffect(false);
                        bangEffectTimerRef.current = null;
                    }, TAROT_BANG_EFFECT_MS);
                    const lostMsg = "You have lost.";
                    toast.info(lostMsg);
                    setNotification(lostMsg, dispatch, "info");
                } else {
                    setWinFireworksAmount(win.toFixed(2));
                    setWinFireworksSubtitle(`Total ${formatTotalMultDisplay(product)}×`);
                    setShowWinFireworks(true);
                    if (winFireworksTimerRef.current) clearTimeout(winFireworksTimerRef.current);
                    winFireworksTimerRef.current = window.setTimeout(() => {
                        setShowWinFireworks(false);
                        winFireworksTimerRef.current = null;
                    }, TAROT_WIN_FIREWORKS_MS);
                    const msg = `You have won $${win.toFixed(2)} in Tarot Game.`;
                    toast.success(msg);
                    setNotification(msg, dispatch, "success");
                }
            }, delay)
        );
    };

    const amountRef = useRef(amount);
    amountRef.current = amount;
    const playLoadingRef = useRef(playLoading);
    playLoadingRef.current = playLoading;
    const commitAmountRef = useRef(commitAmount);
    commitAmountRef.current = commitAmount;
    const handleDrawRef = useRef(handleDraw);
    handleDrawRef.current = handleDraw;

    useEffect(() => {
        const onKeyDown = (e) => {
            if (isHelpModalOpen) return;
            const active = document.activeElement;
            const tag = active?.tagName?.toLowerCase();
            if (tag === "select") return;
            if (tag === "textarea" || active?.isContentEditable) return;
            if (tag === "input" && betAmountInputRef.current && active !== betAmountInputRef.current) return;

            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            const adjustBet = (mult) => {
                const raw = amountRef.current;
                const n = raw === "" ? MIN_AMOUNT : Number(raw);
                const base = Number.isFinite(n) ? Math.max(MIN_AMOUNT, n) : MIN_AMOUNT;
                commitAmountRef.current(base * mult);
            };

            if (e.key === "ArrowUp" || k === "w") {
                e.preventDefault();
                adjustBet(2);
                return;
            }
            if (e.key === "ArrowDown" || k === "s") {
                e.preventDefault();
                adjustBet(0.5);
                return;
            }
            if (e.key === " " || e.code === "Space") {
                e.preventDefault();
                if (playLoadingRef.current) return;
                handleDrawRef.current();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isHelpModalOpen]);

    useEffect(() => {
        onlineUser(20);
        return () => {
            offlineUser(20);
        };
    }, []);

    const slotFaces = [leftFace, centerFace, rightFace];

    return (
        <Box px={{ base: "16px", md: "24px" }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"game" "panel" "empty"',
                    md: '"game game" "panel empty"',
                    "1550px": '"panel game empty"',
                }}
                templateColumns={{
                    sm: "1fr",
                    md: "1fr 1fr",
                    "1550px": "3fr 6fr 2fr",
                }}
                templateRows={{
                    base: "auto auto auto",
                    md: "auto auto",
                    "1550px": "auto",
                }}
                gap={{ base: "16px", md: "24px" }}
                w="100%"
                alignItems="stretch"
            >
                <GridItem
                    area="panel"
                    minW={{ base: 0, md: "350px" }}
                    w="100%"
                    display="flex"
                    flexDirection="column"
                    alignSelf="stretch"
                    minH={0}
                >
                    <Card
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        position="relative"
                        w="100%"
                        minH={TAROT_PANEL_MIN_H}
                        h={{ base: "auto", "1550px": "100%" }}
                        pt="22px"
                        pb="20px"
                        px="22px"
                        overflow="visible"
                    >
                        <IconButton
                            aria-label="How to play Tarot"
                            icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                            size="sm"
                            position="absolute"
                            top="14px"
                            right="14px"
                            zIndex={2}
                            bg="rgba(0, 0, 0, 0.35)"
                            color="#00d4ff"
                            borderRadius="full"
                            _hover={{ bg: "rgba(0, 0, 0, 0.5)", color: "#00D4FF" }}
                            onClick={() => setIsHelpModalOpen(true)}
                        />
                        <CardHeader mb="12px" p={0} flexShrink={0}>
                            <Text fontSize="lg" color="#fff" fontWeight="bold" mb="4px" pr="44px">
                                Tarot Controls
                            </Text>
                        </CardHeader>
                        <CardBody flex="1" display="flex" flexDirection="column" p={0} minH={0}>
                            <VStack spacing="14px" align="stretch" w="100%" maxW={{ base: "100%", sm: "300px" }} mx="auto">
                                <FormControl mb={0}>
                                    <FormLabel color="rgba(255,255,255,0.82)" fontSize="sm" fontWeight="700" mb="6px">
                                        Bet Amount
                                    </FormLabel>
                                    <GradientBorder borderRadius="16px">
                                        <HStack bg="#323738" borderRadius="16px" px="8px" h="52px" spacing="6px">
                                            <IconButton
                                                aria-label="Decrease amount"
                                                icon={<RemoveIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="30px"
                                                w="30px"
                                                minW="30px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="8px"
                                                _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                                onClick={() => commitAmount(amountNum - 0.1)}
                                                isDisabled={!canDecrease}
                                            />
                                            <Input
                                                ref={betAmountInputRef}
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                textAlign="center"
                                                bg="transparent"
                                                border="none"
                                                _focus={{ boxShadow: "none" }}
                                                color="#fff"
                                                fontWeight="bold"
                                                placeholder={MIN_AMOUNT.toFixed(2)}
                                            />
                                            <IconButton
                                                aria-label="Increase amount"
                                                icon={<AddIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="30px"
                                                w="30px"
                                                minW="30px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="8px"
                                                _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                                onClick={() => commitAmount(amountNum + 0.1)}
                                                isDisabled={!canIncrease}
                                            />
                                        </HStack>
                                    </GradientBorder>
                                </FormControl>
                                <ClickButton
                                    h="52px"
                                    borderRadius="16px"
                                    mt={0}
                                    mb={0}
                                    label={playLoading ? "..." : "BET"}
                                    onClick={handleDraw}
                                    disabled={playLoading}
                                />
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="game" minW={0} display="flex" flexDirection="column" alignSelf="stretch" minH={0}>
                    <Box
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        minH={TAROT_MAIN_CARD_MIN_H}
                        h={TAROT_MAIN_CARD_MIN_H}
                        w="100%"
                        minW={0}
                    >
                        <Card
                            flex="1"
                            display="flex"
                            flexDirection="column"
                            pt={{ base: "16px", md: "20px" }}
                            pb={{ base: "16px", md: "20px" }}
                            px={{ base: "14px", md: "20px" }}
                            minH={TAROT_MAIN_CARD_MIN_H}
                            h={TAROT_MAIN_CARD_MIN_H}
                            minW={0}
                            overflow="hidden"
                            alignItems="stretch"
                            w="100%"
                            bg="linear-gradient(180deg, #1a1f26 0%, #14181e 100%)"
                            border="1px solid rgba(0, 212, 255, 0.12)"
                        >
                            <CardBody p={0} display="flex" flexDirection="column" alignItems="stretch" flex="1">
                                <Flex
                                    align="center"
                                    justify="flex-start"
                                    pb={2}
                                    mb={2}
                                    // borderBottom="1px solid rgba(0, 212, 255, 0.2)"
                                    gap={2}
                                >
                                    <HStack spacing={2} color="#00D4FF">
                                        <AutoAwesomeIcon style={{ fontSize: 22 }} />
                                        <Text fontWeight="800" color="#fff" fontSize="md" letterSpacing="0.02em">
                                            Tarot
                                        </Text>
                                    </HStack>
                                </Flex>

                                <VStack flex="1" align="stretch" spacing={0} minH={0} w="100%">
                                    <Flex
                                        flex="0 0 auto"
                                        align="flex-start"
                                        justify="center"
                                        h={{ base: "240px", md: "330px" }}
                                        px={{ base: 3, md: 8 }}
                                        pt={{ base: 2, md: 3 }}
                                        pb={{ base: 2, md: 3 }}
                                        gap={{ base: 3, md: 5 }}
                                        overflow="hidden"
                                    >
                                        {[0, 1, 2].map((slot) => {
                                            const isCenter = slot === 1;
                                            const face = slotFaces[slot];
                                            const frontSrc =
                                                slot === 0 ? frontendLeft : slot === 1 ? frontendBase : frontendRight;
                                            return (
                                                <Box
                                                    key={slot}
                                                    flex="1 1 0"
                                                    minW={0}
                                                    maxW={{ base: "150px", sm: "180px", md: "220px" }}
                                                    alignSelf="flex-start"
                                                >
                                                    <TarotSlotCard
                                                        face={face}
                                                        isCenter={isCenter}
                                                        backSrc={backcard}
                                                        frontSrc={frontSrc}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </Flex>

                                    <Flex justify="center" w="100%" px={{ base: 3, md: 8 }} pt={2} pb={{ base: 3, md: 4 }} mt="auto">
                                        <Box
                                            w="100%"
                                            maxW="400px"
                                            borderRadius="20px"
                                            px={{ base: 5, md: 8 }}
                                            py={{ base: 3, md: 4 }}
                                            bg="linear-gradient(165deg, #2a3138 0%, #171c22 45%, #12161c 100%)"
                                            border="1px solid rgba(0, 212, 255, 0.35)"
                                            boxShadow="0 10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.35)"
                                        >
                                            <Text
                                                textAlign="center"
                                                fontSize={{ base: "22px", md: "26px" }}
                                                fontWeight="800"
                                                color="#fff"
                                                fontVariantNumeric="tabular-nums"
                                                letterSpacing="0.04em"
                                                lineHeight="1.2"
                                                textShadow="0 1px 18px rgba(0, 212, 255, 0.35)"
                                            >
                                                {`${formatTotalMultDisplay(shownMult)}×`}
                                            </Text>
                                            <Text
                                                textAlign="center"
                                                fontSize="10px"
                                                fontWeight="700"
                                                color="rgba(255,255,255,0.4)"
                                                letterSpacing="0.14em"
                                                textTransform="uppercase"
                                                mt={1.5}
                                            >
                                                Total multi
                                            </Text>
                                        </Box>
                                    </Flex>
                                </VStack>
                            </CardBody>
                        </Card>
                    </Box>
                </GridItem>

                <GridItem area="empty" minW={0} display="flex" flexDirection="column" alignSelf="stretch" minH={0}>
                    <Box
                        flex="1"
                        minH={{ base: "250px", "1550px": "100%" }}
                        h={{ base: "auto", "1550px": "100%" }}
                        w="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        <TarotRealView suppressFeedUntil={tarotLiveSuppressUntil} />
                    </Box>
                </GridItem>
            </Grid>

            <TarotBetHistory />
            <WinFireworksEffect
                isVisible={showWinFireworks}
                totalEarn={winFireworksAmount}
                subtitle={winFireworksSubtitle}
                subtitleSyncWithEarn
                duration={TAROT_WIN_FIREWORKS_MS}
            />
            <BangBurstEffect isVisible={showBangEffect} duration={TAROT_BANG_EFFECT_MS} />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#1d2228" border="1px solid rgba(0,212,255,0.2)">
                    <ModalHeader color="white">How to play Tarot</ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: "#00D4FF" }} />
                    <ModalBody color="rgba(255,255,255,0.9)" pb={5}>
                        <VStack align="stretch" spacing={3}>
                            <Text fontSize="sm">
                                1. Enter your bet amount and press <strong>BET</strong>.
                            </Text>
                            <Text fontSize="sm">
                                2. Cards reveal in sequence: <strong>Base</strong> then two <strong>Side</strong> cards.
                            </Text>
                            <Text fontSize="sm">
                                3. Final multiplier is <strong>Base × Left × Right</strong>.
                            </Text>
                            <Text fontSize="sm">
                                4. Win amount is <strong>Bet × Total Multi</strong>.
                            </Text>
                            <Box pt={1}>
                                <Text fontSize="sm" color="#00D4FF" fontWeight="700" mb={1}>
                                    Keyboard shortcuts
                                </Text>
                                <Text fontSize="sm">
                                    <strong>W</strong> / <strong>Arrow Up</strong>: increase bet (×2)
                                </Text>
                                <Text fontSize="sm">
                                    <strong>S</strong> / <strong>Arrow Down</strong>: decrease bet (×0.5)
                                </Text>
                                <Text fontSize="sm">
                                    <strong>Space</strong>: same as pressing <strong>BET</strong>
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
