import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import ForestIcon from '@mui/icons-material/Forest';
import { 
    Box,
    Grid,
    GridItem,
    FormControl,
    FormLabel,
    Input,
    Button,
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
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Text,
} from "@chakra-ui/react";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ClickButton from 'components/Input/ClickButton';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import CardHeader from 'components/Card/CardHeader.js';
import {
    alphaTreeStart,
    alphaTreePick,
    alphaTreeCashOut,
    getAlphaTreeState,
} from "action/AlphaTreeActions";
import { onlineUser, offlineUser } from "action/BetActions";
import { allowedLettersForStep, ALPHA_TREE_STEP_LETTERS } from "constants/alphaTreeSteps";
import AlphaTreeRealView from "./AlphaTreeItem/AlphaTreeView";
import BetHistory from "./AlphaTreeItem/BetHistory";
import AlphaTreeLetterDiagram from "./AlphaTreeItem/AlphaTreeLetterDiagram";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";

const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 20;
const ALPHA_TREE_MAIN_CARD_HEIGHT = "450px";
const ALPHA_TREE_PICK_BTN_MIN_W = "48px";
const ALPHA_TREE_PICK_BTN_H = "44px";
const ALPHA_TREE_PICK_COL_MIN_H = "114px";
const ALPHA_TREE_ROW_GAP = "6px";

/** Column gap for 4-button grid (step 2 + steps 3–9) — shared by play UI and step-2 line overlay. */
const FOUR_PICK_GRID_COL_GAP = { base: "44px", sm: "64px" };

function colorForAlphaTreeBranchValue(v) {
    const x = Number(v);
    if (!Number.isFinite(x) || x <= 1e-12) return "#E74C3C";
    if (x < 1 - 1e-9) return "#00D4FF";
    return "#FFD700";
}

/**
 * Steps 2–9 non-bust reveal: same 2×3 grid as playing; SVG lines from prev letter to each option (measured button centers).
 * entry: { prevLetter, prevValue, optionLetters[3], letterResults, chosen }
 */
function AlphaTreeBranchPreview({ entry }) {
    const rootRef = useRef(null);
    const [dims, setDims] = useState(null);

    const lr = entry?.letterResults;
    const chosen = String(entry?.chosen || "").toUpperCase();
    const prevLetter = String(entry?.prevLetter || "").toUpperCase();
    const optionLetters = Array.isArray(entry?.optionLetters) ? entry.optionLetters.map((x) => String(x).toUpperCase()) : [];
    const [o0, o1, o2] = optionLetters;

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || !prevLetter || !o0 || !o1 || !o2) return undefined;

        const lettersForMeasure = [prevLetter, o0, o1, o2];

        const measure = () => {
            const rootRect = root.getBoundingClientRect();
            const centerOf = (attr) => {
                const wrap = root.querySelector(`[data-at-center="${attr}"]`);
                const btn = wrap?.querySelector("button");
                if (!btn) return null;
                const r = btn.getBoundingClientRect();
                return {
                    x: r.left + r.width / 2 - rootRect.left,
                    y: r.top + r.height / 2 - rootRect.top,
                };
            };
            const next = { w: rootRect.width, h: rootRect.height };
            let ok = true;
            for (const L of lettersForMeasure) {
                const pt = centerOf(L);
                if (!pt) {
                    ok = false;
                    break;
                }
                next[L] = pt;
            }
            if (ok) {
                setDims(next);
            }
        };

        measure();
        const ro = new ResizeObserver(() => measure());
        ro.observe(root);
        return () => ro.disconnect();
    }, [entry, prevLetter, o0, o1, o2]);

    if (!lr || typeof lr !== "object" || !prevLetter || !o0 || !o1 || !o2) return null;

    const valueByLetter = {
        [o0]: Number(lr[o0]),
        [o1]: Number(lr[o1]),
        [o2]: Number(lr[o2]),
    };
    const prevDisplay = Number.isFinite(Number(entry?.prevValue)) ? Number(entry.prevValue) : null;

    const resolvedCell = (letter, value, anchor) => {
        const hasVal = Number.isFinite(Number(value));
        return (
            <Box data-at-center={anchor}>
                <VStack spacing="2px" align="center">
                    <Button
                        type="button"
                        minW={ALPHA_TREE_PICK_BTN_MIN_W}
                        h={ALPHA_TREE_PICK_BTN_H}
                        fontSize="xl"
                        fontWeight="bold"
                        color="#000"
                        bg="#FFD700"
                        border="2px solid #000"
                        borderRadius="12px"
                        boxShadow="3px 3px 0 #000"
                        isDisabled
                        _hover={{ bg: "#ffe066" }}
                    >
                        {letter}
                    </Button>
                    {hasVal ? (
                        <Text mt="2px" fontSize="11px" fontWeight="bold" color="#FFD700" lineHeight="1">
                            {Number(value).toFixed(2)}
                        </Text>
                    ) : (
                        <Text mt="2px" fontSize="11px" opacity={0}>
                            0.00
                        </Text>
                    )}
                </VStack>
            </Box>
        );
    };

    const startPt = dims && dims[prevLetter];

    return (
        <Box ref={rootRef} position="relative" w="fit-content" mx="auto">
            {dims && startPt ? (
                <svg
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                    width={dims.w}
                    height={dims.h}
                >
                    {[o0, o1, o2].map((ch) => {
                        const v = valueByLetter[ch];
                        const isChosen = chosen === ch;
                        const end = dims[ch];
                        if (!end) return null;
                        return (
                            <line
                                key={ch}
                                x1={startPt.x}
                                y1={startPt.y}
                                x2={end.x}
                                y2={end.y}
                                stroke={colorForAlphaTreeBranchValue(v)}
                                strokeWidth={isChosen ? 5 : 2.5}
                                opacity={isChosen ? 1 : 0.5}
                                strokeLinecap="round"
                            />
                        );
                    })}
                </svg>
            ) : null}
            <Grid
                position="relative"
                zIndex={2}
                templateColumns="auto auto"
                templateRows="auto auto auto"
                columnGap={FOUR_PICK_GRID_COL_GAP}
                rowGap={ALPHA_TREE_ROW_GAP}
                alignItems="flex-start"
                justifyItems="center"
            >
                <GridItem colStart={1} rowStart={1} />
                <GridItem colStart={2} rowStart={1}>
                    {resolvedCell(o0, valueByLetter[o0], o0)}
                </GridItem>
                <GridItem colStart={1} rowStart={2} alignSelf="flex-start">
                    {resolvedCell(prevLetter, prevDisplay, prevLetter)}
                </GridItem>
                <GridItem colStart={2} rowStart={2} alignSelf="flex-start">
                    {resolvedCell(o1, valueByLetter[o1], o1)}
                </GridItem>
                <GridItem colStart={1} rowStart={3} />
                <GridItem colStart={2} rowStart={3}>
                    {resolvedCell(o2, valueByLetter[o2], o2)}
                </GridItem>
            </Grid>
        </Box>
    );
}

/** High-band upper bound for step s (2–10): base × 2^(s−1); must use server `baseMultiplier` */
function alphaTreeMaxForRandomStep(step, baseMult) {
    const s = Number(step);
    const b = Number(baseMult);
    const base = Number.isFinite(b) && b > 0 ? b : 0.6;
    if (!Number.isFinite(s) || s < 2 || s > 10) return null;
    return Math.round(base * Math.pow(2, s - 1) * 100) / 100;
}

export default function AlphaTreePage() {

    const dispatch = useDispatch();
    const history = useHistory();
    const [amount, setAmount] = useState("0.1");
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    /** Server game state (null = no active round) */
    const [treeState, setTreeState] = useState(null);
    const [playLoading, setPlayLoading] = useState(false);
    const [pickLoading, setPickLoading] = useState(false);
    const [cashLoading, setCashLoading] = useState(false);
    /** Last step result shown (e.g. "0.60" after A, or random draw) */
    const [lastStepResult, setLastStepResult] = useState(null);
    /** Band label for last pick (from server lastDraw.band) */
    const [lastBandLabel, setLastBandLabel] = useState(null);
    /** Completed picks for diagram path: lines + per-letter results */
    const [pathSteps, setPathSteps] = useState([]);
    /** Server `alphatreesettings.baseMultiplier` for UI when idle or to label caps */
    const [displayBaseMultiplier, setDisplayBaseMultiplier] = useState(0.6);
    /** Full-screen win FX after cash out (matches Mines / Lottery). */
    const [cashOutWinFx, setCashOutWinFx] = useState({
        visible: false,
        amount: "0.00",
        subtitle: "",
    });
    const [cashOutFxAnchorRect, setCashOutFxAnchorRect] = useState(null);
    /** Steps 2–9: show all branch values + lines for 1s before advancing tree state. */
    const [branchPreview, setBranchPreview] = useState(null);
    const cashOutFxTimeoutRef = useRef(null);
    const stepAdvanceTimeoutRef = useRef(null);
    const alphaTreeMainCardRef = useRef(null);
    const amountRef = useRef('0.10');
    const updateAmount = (value) => {
        setAmount(value);
        amountRef.current = value;
    };
    useEffect(() => {
        amountRef.current = amount;
    }, [amount]);
    useEffect(() => {
        onlineUser(13);
        return () => {
            offlineUser(13);
            if (cashOutFxTimeoutRef.current) {
                clearTimeout(cashOutFxTimeoutRef.current);
                cashOutFxTimeoutRef.current = null;
            }
            if (stepAdvanceTimeoutRef.current) {
                clearTimeout(stepAdvanceTimeoutRef.current);
                stepAdvanceTimeoutRef.current = null;
            }
        };
    }, []);

    const handleAmountChange = (e) => {
        const value = e.target.value;
        // Allow empty
        if (value === '') {
            updateAmount('');
            return;
        }

        // Allow typing numbers with up to 2 decimals
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            updateAmount(value);
        }
    };

    const handleAmountBlur = () => {
        let num = parseFloat(amount);

        if (isNaN(num)) {
            updateAmount('0.10');
            return;
        }

        num = Math.max(0.10, Math.min(1000, num));
        updateAmount(num.toFixed(2));
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await getAlphaTreeState(history);
                if (cancelled) return;
                if (d?.alphaTree) setTreeState(d.alphaTree);
                const bm = d?.baseMultiplier;
                if (bm != null && Number.isFinite(Number(bm))) {
                    setDisplayBaseMultiplier(Number(bm));
                }
            } catch (_) {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [history]);

    const safeBaseMultiplier = Number(treeState?.baseMultiplier ?? displayBaseMultiplier);
    const effectiveBase =
        Number.isFinite(safeBaseMultiplier) && safeBaseMultiplier > 0 ? safeBaseMultiplier : 0.6;

    const amountLocked = Boolean(treeState);

    const handlePlayGame = async () => {
        const bet = parseFloat(amountRef.current || amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT || bet > MAX_AMOUNT) {
            toast.error(`Enter a bet between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
            return;
        }
        setPlayLoading(true);
        setLastStepResult(null);
        setLastBandLabel(null);
        setPathSteps([]);
        setBranchPreview(null);
        try {
            const data = await alphaTreeStart({ betAmount: bet }, dispatch, history);
            setTreeState(data.alphaTree ?? null);
            const bm = data?.alphaTree?.baseMultiplier;
            if (bm != null && Number.isFinite(Number(bm))) {
                setDisplayBaseMultiplier(Number(bm));
            }
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Could not start game";
            toast.error(msg);
        } finally {
            setPlayLoading(false);
        }
    };

    const handlePickLetter = async (letter) => {
        setPickLoading(true);
        try {
            const data = await alphaTreePick({ letter }, dispatch, history);
            const ld = data.lastDraw;
            const baseForUi = Number(data?.alphaTree?.baseMultiplier ?? displayBaseMultiplier);
            const baseMult =
                Number.isFinite(baseForUi) && baseForUi > 0 ? baseForUi : effectiveBase;
            if (data?.alphaTree?.baseMultiplier != null && Number.isFinite(Number(data.alphaTree.baseMultiplier))) {
                setDisplayBaseMultiplier(Number(data.alphaTree.baseMultiplier));
            }
            if (ld?.kind === "fixed_a" && typeof ld.value === "number") {
                setLastStepResult(Number(ld.value).toFixed(2));
                setLastBandLabel(null);
            } else if (ld?.kind === "fixed_z" && typeof ld.value === "number") {
                setLastStepResult(ld.value.toFixed(2));
                setLastBandLabel(
                    `Fixed step 10 — ${ld.value.toFixed(2)} (base × 2^9 with mode tweak)`
                );
            } else if (ld && typeof ld.value === "number") {
                setLastStepResult(ld.value.toFixed(2));
                if (ld.band === "zero") {
                    setLastBandLabel("0 (bust)");
                } else if (ld.band === "mid") {
                    setLastBandLabel("Between 0.1 and 1");
                } else if (ld.band === "high") {
                    const cap = alphaTreeMaxForRandomStep(ld.step, baseMult);
                    setLastBandLabel(
                        cap != null ? `Between 1 and ${cap.toFixed(2)}` : "Between 1 and max"
                    );
                } else {
                    setLastBandLabel(null);
                }
            }
            if (ld?.busted) {
                setTreeState(null);
                setLastStepResult("0");
                setLastBandLabel("0 (bust)");
                setPathSteps([]);
                setBranchPreview(null);
                toast.error("Round ended — result was 0");
                return;
            }
            let pathParentForBranchPreview = null;

            if (ld?.kind === "fixed_a" && typeof ld.value === "number") {
                const v = ld.value;
                setPathSteps([
                    {
                        step: 1,
                        letter: "A",
                        value: v,
                        letterResults: ld.letterResults || { A: v },
                    },
                ]);
            } else if (ld?.kind === "fixed_z" && typeof ld.value === "number") {
                setPathSteps((prev) => [
                    ...prev,
                    {
                        step: 10,
                        letter: "Z",
                        value: ld.value,
                        letterResults: ld.letterResults || { Z: ld.value },
                    },
                ]);
            } else if (ld && typeof ld.value === "number" && ld.letter) {
                const L = String(ld.letter).toUpperCase();
                const lr = ld.letterResults;
                const letterResults =
                    lr && typeof lr === "object"
                        ? Object.fromEntries(
                              Object.entries(lr).map(([k, v]) => [
                                  String(k).toUpperCase(),
                                  v,
                              ])
                          )
                        : undefined;
                setPathSteps((prev) => {
                    pathParentForBranchPreview = prev.length ? prev[prev.length - 1] : null;
                    return [
                        ...prev,
                        {
                            step: ld.step,
                            letter: L,
                            value: ld.value,
                            letterResults,
                        },
                    ];
                });
            }
            const stepNum = Number(ld?.step);
            const rawLetterResults = ld?.letterResults;
            const normLetterResults =
                rawLetterResults && typeof rawLetterResults === "object"
                    ? Object.fromEntries(
                          Object.entries(rawLetterResults).map(([k, v]) => [
                              String(k).toUpperCase(),
                              Number(v),
                          ])
                      )
                    : {};
            const pickedVal = Number(ld?.value);
            const optionLettersAtStep =
                stepNum >= 2 && stepNum <= 9 ? ALPHA_TREE_STEP_LETTERS[stepNum - 1] : null;

            /** Steps 2–9: non-bust pick → show prev + all three branch values and lines, then 1s, then next step UI */
            const isThreeWayNonBustReveal =
                ld &&
                !ld.busted &&
                !ld.kind &&
                stepNum >= 2 &&
                stepNum <= 9 &&
                Number.isFinite(pickedVal) &&
                pickedVal > 1e-12 &&
                Array.isArray(optionLettersAtStep) &&
                optionLettersAtStep.length === 3 &&
                optionLettersAtStep.every((ch) => Number.isFinite(normLetterResults[String(ch).toUpperCase()])) &&
                pathParentForBranchPreview &&
                data.alphaTree &&
                data.alphaTree.phase === "playing";

            if (isThreeWayNonBustReveal) {
                const opts = optionLettersAtStep.map((c) => String(c).toUpperCase());
                const parentLetter = String(pathParentForBranchPreview.letter || "").toUpperCase();
                const parentVal = Number(pathParentForBranchPreview.value);
                setBranchPreview({
                    step: stepNum,
                    chosen: String(ld.letter).toUpperCase(),
                    letterResults: normLetterResults,
                    prevLetter: parentLetter,
                    prevValue: Number.isFinite(parentVal) ? parentVal : null,
                    optionLetters: opts,
                });
                await new Promise((resolve) => {
                    if (stepAdvanceTimeoutRef.current) {
                        clearTimeout(stepAdvanceTimeoutRef.current);
                    }
                    stepAdvanceTimeoutRef.current = setTimeout(() => {
                        stepAdvanceTimeoutRef.current = null;
                        resolve();
                    }, 1000);
                });
                setBranchPreview(null);
            }
            setTreeState(data.alphaTree ?? null);
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Invalid move";
            toast.error(msg);
        } finally {
            setPickLoading(false);
        }
    };

    const handleCashOutGame = async () => {
        setCashLoading(true);
        try {
            const cardRect = alphaTreeMainCardRef.current?.getBoundingClientRect?.();
            if (cardRect) {
                setCashOutFxAnchorRect({
                    left: cardRect.left,
                    top: cardRect.top,
                    width: cardRect.width,
                    height: cardRect.height,
                });
            }
            const data = await alphaTreeCashOut(dispatch, history);
            const win = data.cashout?.win;
            const totalMult = data.cashout?.totalMultiplier;
            setTreeState(null);
            setLastStepResult(null);
            setLastBandLabel(null);
            setPathSteps([]);
            setBranchPreview(null);
            const amountStr =
                win != null && Number.isFinite(Number(win))
                    ? Number(win).toFixed(2)
                    : "0.00";
            const subtitle =
                totalMult != null && Number.isFinite(Number(totalMult))
                    ? `Total multiplier ×${Number(totalMult).toFixed(2)}`
                    : "";
            setCashOutWinFx({
                visible: true,
                amount: amountStr,
                subtitle,
            });
            if (cashOutFxTimeoutRef.current) {
                clearTimeout(cashOutFxTimeoutRef.current);
            }
            const fxMs = 2600;
            cashOutFxTimeoutRef.current = setTimeout(() => {
                setCashOutWinFx((s) => ({ ...s, visible: false }));
                cashOutFxTimeoutRef.current = null;
            }, fxMs);
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Cash out failed";
            toast.error(msg);
        } finally {
            setCashLoading(false);
        }
    };

    const lettersToShow =
        treeState &&
        (treeState.allowedLetters?.length
            ? treeState.allowedLetters
            : allowedLettersForStep(treeState.step, treeState.phase));

    /** Letters shown for a given diagram step (1 => A, 2-9 => groups, 10 => Z). */
    const lettersForStepNum = (stepNum) => {
        const s = Number(stepNum);
        if (!Number.isFinite(s)) return [];
        if (s === 1) return ["A"];
        if (s === 10) return ["Z"];
        if (s >= 2 && s <= 9) return ALPHA_TREE_STEP_LETTERS[s - 1] || [];
        return [];
    };

    /** After step 1 (playing) or after step 10 (await_cashout). Not available on step 1 before A. */
    const canCashOutAlpha =
        treeState &&
        (treeState.phase === "playing" || treeState.phase === "await_cashout");

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <WinFireworksEffect
                isVisible={cashOutWinFx.visible}
                totalEarn={cashOutWinFx.amount}
                subtitle={cashOutWinFx.subtitle}
                duration={2600}
                anchorRect={cashOutFxAnchorRect}
            />
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
                    '1550px': '"panel game empty"'
                }}
                templateColumns={{
                    sm: '1fr',
                    md: '1fr 1fr',
                    '1550px': '3fr 6fr 2fr'
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'auto'
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
            >
                <GridItem area="panel" minW={"350px"}>
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <ForestIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
                                </Text>
                            </Flex>
                        </CardHeader>
                        <Box position="absolute" top="12px" right="12px" zIndex={10}>
                            <IconButton
                                type="button"
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
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%">
                            <VStack spacing="24px" align="center" w="100%">
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }}>
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Bet
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
                                                name="amount"
                                                bg="transparent"
                                                border="transparent"
                                                fontSize="xl"
                                                fontWeight="bold"
                                                h="auto"
                                                p="0"
                                                color="white"
                                                type="text"
                                                inputMode="decimal"
                                                min={MIN_AMOUNT}
                                                max={MAX_AMOUNT}
                                                step="0.01"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.10"
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
                                                disabled={amountLocked || playLoading}
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
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(MAX_AMOUNT, current / 2);
                                                        setAmount(Math.max(MIN_AMOUNT, newValue).toFixed(2));
                                                    }}
                                                    isDisabled={amountLocked || playLoading}
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
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(MAX_AMOUNT, current * 2);
                                                        setAmount(newValue.toFixed(2));
                                                    }}
                                                    isDisabled={amountLocked || playLoading}
                                                >
                                                    ×2
                                                </Button>
                                                <Popover placement="bottom-end" closeOnBlur={true}>
                                                    <PopoverTrigger>
                                                        <Box
                                                            borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                            borderTopRightRadius="18px"
                                                            borderBottomRightRadius="18px"
                                                            overflow="hidden"
                                                            cursor="pointer"
                                                        >
                                                            <VStack spacing="0" align="center" h="100%">
                                                                <IconButton
                                                                    aria-label="Open slider dropdown"
                                                                    icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                                    size="xs"
                                                                    h="100%"
                                                                    w="24px"
                                                                    minW="24px"
                                                                    bg="transparent"
                                                                    color="#fff"
                                                                    borderRadius="0"
                                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                                />
                                                            </VStack>
                                                        </Box>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        bg="#323738"
                                                        border="1px solid rgba(255, 255, 255, 0.2)"
                                                        borderRadius="12px"
                                                        w="300px"
                                                        _focus={{ boxShadow: 'none' }}
                                                    >
                                                        <PopoverBody p="16px">
                                                            <Flex align="center" gap="12px" w="100%">
                                                                <Text
                                                                    color="#fff"
                                                                    fontSize="sm"
                                                                    fontWeight="bold"
                                                                    minW="30px"
                                                                    cursor="pointer"
                                                                    onClick={() => setAmount(MIN_AMOUNT.toFixed(2))}
                                                                >
                                                                    Min
                                                                </Text>
                                                                <Box flex="1" position="relative">
                                                                    <Slider
                                                                        aria-label="Amount slider"
                                                                        min={MIN_AMOUNT}
                                                                        max={MAX_AMOUNT}
                                                                        step={0.01}
                                                                        value={parseFloat(amount || MIN_AMOUNT)}
                                                                        onChange={(val) => setAmount(val.toFixed(2))}
                                                                        focusThumbOnChange={false}
                                                                    >
                                                                        <SliderTrack
                                                                            bg="#2a2d2e"
                                                                            h="6px"
                                                                            borderRadius="3px"
                                                                        >
                                                                            <SliderFilledTrack bg="transparent" />
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
                                                                    {/* Indicator dots */}
                                                                    <Box
                                                                        position="absolute"
                                                                        top="50%"
                                                                        left="0"
                                                                        right="0"
                                                                        transform="translateY(-50%)"
                                                                        h="6px"
                                                                        display="flex"
                                                                        justifyContent="space-between"
                                                                        alignItems="center"
                                                                        px="6px"
                                                                        pointerEvents="none"
                                                                    >
                                                                        {[0, 1, 2, 3, 4].map((i) => (
                                                                            <Box
                                                                                key={i}
                                                                                w="2px"
                                                                                h="2px"
                                                                                borderRadius="50%"
                                                                                bg="rgba(255, 255, 255, 0.3)"
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                </Box>
                                                                <Text
                                                                    color="#fff"
                                                                    fontSize="sm"
                                                                    fontWeight="bold"
                                                                    minW="30px"
                                                                    textAlign="right"
                                                                    cursor="pointer"
                                                                    onClick={() => setAmount(MAX_AMOUNT.toFixed(2))}
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
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }} mt="5">
                                    <Grid templateColumns="1fr 1fr" gap="8px">
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#00D4FF"}
                                            color="#fff"
                                            border={"1px solid rgba(0, 212, 255, 0.3)"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={Boolean(treeState) || playLoading}
                                            onClick={handlePlayGame}
                                            label={playLoading ? "..." : "Bet"}
                                        />
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg="#00D4FF"
                                            color="#fff"
                                            border="1px solid rgba(0, 212, 255, 0.3)"
                                            _hover={{
                                                borderColor: "#00D4FF",
                                                transform: "translateY(-2px)",
                                                boxShadow: "0 4px 12px rgba(0, 212, 255, 0.3)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={!canCashOutAlpha || cashLoading}
                                            onClick={handleCashOutGame}
                                            label={cashLoading ? "..." : "Cash Out"}
                                        />
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={ALPHA_TREE_MAIN_CARD_HEIGHT}>
                    <Card
                        ref={alphaTreeMainCardRef}
                        pt="30px"
                        pb="22px"
                        px="22px"
                        h={ALPHA_TREE_MAIN_CARD_HEIGHT}
                        minH={ALPHA_TREE_MAIN_CARD_HEIGHT}
                        maxH={ALPHA_TREE_MAIN_CARD_HEIGHT}
                        alignItems="center"
                        w="100%"
                    >
                        <CardHeader mb={!treeState ? "16px" : undefined}>
                            <Text fontSize="lg" color="#fff" fontWeight="bold" textAlign="center" w="100%">
                                Alpha Tree
                            </Text>
                        </CardHeader>
                        <CardBody
                            h="100%"
                            w={{ base: '100%' }}
                            minW={{ base: '100%', sm: '450px' }}
                            maxW="450px"
                            mx="auto"
                            overflowY={!treeState ? "auto" : "hidden"}
                            overflowX="hidden"
                            position="relative"
                            sx={
                                !treeState
                                    ? {
                                          "&::-webkit-scrollbar": { width: "6px" },
                                          "&::-webkit-scrollbar-thumb": {
                                              background: "#555b5e",
                                              borderRadius: "8px",
                                          },
                                      }
                                    : undefined
                            }
                        >
                            {!treeState ? (
                                <VStack align="stretch" spacing={3} pt={3} pb={2} textAlign="left">
                                    <Text
                                        fontSize="sm"
                                        fontWeight="bold"
                                        color="#00D4FF"
                                        textAlign="center"
                                    >
                                        How to play
                                    </Text>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.82)" lineHeight="1.55">
                                        1. In the <Text as="span" fontWeight="bold">Panel</Text>, set your stake
                                        and press <Text as="span" fontWeight="bold" color="#FFD700">Bet</Text>.
                                    </Text>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.82)" lineHeight="1.55">
                                        2. Step 1: tap <Text as="span" fontWeight="bold">A</Text> — your total
                                        uses base ×{" "}
                                        <Text as="span" color="#FFD700">{effectiveBase.toFixed(2)}</Text>.
                                    </Text>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.82)" lineHeight="1.55">
                                        3. Steps 2–9: choose one letter per step (three options). Step 10: tap{" "}
                                        <Text as="span" fontWeight="bold">Z</Text> for the final multiplier.
                                    </Text>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.82)" lineHeight="1.55">
                                        4. Press <Text as="span" fontWeight="bold" color="#FFD700">Cash Out</Text>{" "}
                                        in the panel whenever you want to collect bet × current total multiplier.
                                    </Text>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.55)" lineHeight="1.5" pt={1}>
                                        Tap the <Text as="span" color="#00D4FF">?</Text> in the panel for full
                                        rules.
                                    </Text>
                                </VStack>
                            ) : (
                                <VStack spacing="12px" w="100%" align="stretch">
                                    <Flex justify="space-between" wrap="wrap" gap={2}>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.85)">
                                            Step:{" "}
                                            <Text as="span" color="#00D4FF" fontWeight="bold">
                                                {treeState.phase === "await_cashout" ? 10 : treeState.step}
                                            </Text>
                                            / 10
                                        </Text>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.85)">
                                            Total ×:{" "}
                                            <Text as="span" color="#FFD700" fontWeight="bold">
                                                {Number(treeState.cumulativeMultiplier ?? 1).toFixed(2)}
                                            </Text>
                                        </Text>
                                    </Flex>
                                    {treeState.phase === "await_cashout" ? null : (
                                        <>
                                            {(() => {
                                                if (!treeState) return null;

                                                const lastPath =
                                                    Array.isArray(pathSteps) && pathSteps.length
                                                        ? pathSteps[pathSteps.length - 1]
                                                        : null;

                                                const prevLetter = lastPath?.letter || null;

                                                /** Center A-only and A→B/C/D fan in the play area (middle of the card on X, balanced on Y). */
                                                const centerGameDiagram = (node) => (
                                                    <Box
                                                        w="100%"
                                                        display="flex"
                                                        flexDirection="column"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        minH={{ base: "170px", sm: "190px" }}
                                                        py={1}
                                                    >
                                                        {node}
                                                    </Box>
                                                );

                                                const renderResolvedButton = (ch, resultValue = null) => {
                                                    const hasValue = Number.isFinite(Number(resultValue));
                                                    return (
                                                        <VStack spacing="2px">
                                                            <Button
                                                                type="button"
                                                                minW={ALPHA_TREE_PICK_BTN_MIN_W}
                                                                h={ALPHA_TREE_PICK_BTN_H}
                                                                fontSize="xl"
                                                                fontWeight="bold"
                                                                color="#000"
                                                                bg="#FFD700"
                                                                border="2px solid #000"
                                                                borderRadius="12px"
                                                                boxShadow="3px 3px 0 #000"
                                                                isDisabled
                                                                _hover={{ bg: "#ffe066" }}
                                                            >
                                                                {ch}
                                                            </Button>
                                                            {hasValue ? (
                                                                <Text mt="2px" fontSize="11px" fontWeight="bold" color="#FFD700" lineHeight="1">
                                                                    {Number(resultValue).toFixed(2)}
                                                                </Text>
                                                            ) : (
                                                                <Text mt="2px" fontSize="11px" opacity={0}>
                                                                    0.00
                                                                </Text>
                                                            )}
                                                        </VStack>
                                                    );
                                                };

                                                /** Single pick letter button — shared by step 2 (B/C/D) and step 3+ columns. */
                                                const pickLetterButtonEl = (ch, keyPrefix) => (
                                                    <Button
                                                        key={`${keyPrefix}-${ch}`}
                                                        type="button"
                                                        minW={ALPHA_TREE_PICK_BTN_MIN_W}
                                                        h={ALPHA_TREE_PICK_BTN_H}
                                                        fontSize="xl"
                                                        fontWeight="bold"
                                                        color="#000"
                                                        bg="#FFD700"
                                                        border="2px solid #000"
                                                        borderRadius="12px"
                                                        boxShadow="3px 3px 0 #000"
                                                        isLoading={pickLoading}
                                                        isDisabled={pickLoading}
                                                        onClick={() => handlePickLetter(ch)}
                                                        _hover={{ bg: "#ffe066" }}
                                                    >
                                                        {ch}
                                                    </Button>
                                                );

                                                /** Three vertical pick buttons — used for step 10 (single Z) and fallbacks. */
                                                const renderLetterPickColumn = (letterList, keyPrefix) => (
                                                    <VStack
                                                        minW="86px"
                                                        minH={ALPHA_TREE_PICK_COL_MIN_H}
                                                        justify="space-between"
                                                        align="center"
                                                    >
                                                        {(letterList || []).map((ch) => pickLetterButtonEl(ch, keyPrefix))}
                                                    </VStack>
                                                );

                                                /** Same 2×3 grid every step with 3 picks: [top] [p0], [mid] resolved + [p1], [bot] [p2]. */
                                                const renderFourPickGrid = (resolvedLetter, resolvedValue, picks, keyPrefix) => {
                                                    const [p0, p1, p2] = picks || [];
                                                    if (!p0 || !p1 || !p2) return null;
                                                    return (
                                                        <Grid
                                                            mx="auto"
                                                            templateColumns="auto auto"
                                                            templateRows="auto auto auto"
                                                            columnGap={FOUR_PICK_GRID_COL_GAP}
                                                            rowGap={ALPHA_TREE_ROW_GAP}
                                                            alignItems="flex-start"
                                                            justifyItems="center"
                                                        >
                                                            <GridItem colStart={1} rowStart={1} />
                                                            <GridItem colStart={2} rowStart={1}>
                                                                {pickLetterButtonEl(p0, keyPrefix)}
                                                            </GridItem>
                                                            <GridItem colStart={1} rowStart={2} alignSelf="flex-start">
                                                                {resolvedLetter ? renderResolvedButton(resolvedLetter, resolvedValue) : cellSpacer}
                                                            </GridItem>
                                                            <GridItem colStart={2} rowStart={2} alignSelf="flex-start">
                                                                {pickLetterButtonEl(p1, keyPrefix)}
                                                            </GridItem>
                                                            <GridItem colStart={1} rowStart={3} />
                                                            <GridItem colStart={2} rowStart={3}>
                                                                {pickLetterButtonEl(p2, keyPrefix)}
                                                            </GridItem>
                                                        </Grid>
                                                    );
                                                };

                                                /** Step 10 only Z: final two buttons on the same row (prev letter | Z). */
                                                const renderStepTenGrid = (resolvedLetter, resolvedValue, pickLetter, keyPrefix) => {
                                                    const cellSpacer = (
                                                        <Box
                                                            minW={ALPHA_TREE_PICK_BTN_MIN_W}
                                                            h={ALPHA_TREE_PICK_BTN_H}
                                                            visibility="hidden"
                                                            pointerEvents="none"
                                                            aria-hidden
                                                        />
                                                    );
                                                    return (
                                                        <Grid
                                                            mx="auto"
                                                            templateColumns="auto auto"
                                                            templateRows="auto auto auto"
                                                            columnGap={FOUR_PICK_GRID_COL_GAP}
                                                            rowGap={ALPHA_TREE_ROW_GAP}
                                                            alignItems="flex-start"
                                                            justifyItems="center"
                                                        >
                                                            <GridItem colStart={1} rowStart={1} />
                                                            <GridItem colStart={2} rowStart={1}>
                                                                {cellSpacer}
                                                            </GridItem>
                                                            <GridItem colStart={1} rowStart={2} alignSelf="flex-start">
                                                                {resolvedLetter ? renderResolvedButton(resolvedLetter, resolvedValue) : cellSpacer}
                                                            </GridItem>
                                                            <GridItem colStart={2} rowStart={2} alignSelf="flex-start">
                                                                {pickLetterButtonEl(pickLetter || "Z", keyPrefix)}
                                                            </GridItem>
                                                            <GridItem colStart={1} rowStart={3} />
                                                            <GridItem colStart={2} rowStart={3}>
                                                                {cellSpacer}
                                                            </GridItem>
                                                        </Grid>
                                                    );
                                                };

                                                /** Step 1: only A is clickable; B/C/D placeholders — same positions as step 2 */
                                                const renderAwaitStepOneFan = () => {
                                                    return (
                                                        <VStack justify="center" align="center" spacing="10px">
                                                            <Button
                                                                type="button"
                                                                minW={ALPHA_TREE_PICK_BTN_MIN_W}
                                                                h={ALPHA_TREE_PICK_BTN_H}
                                                                fontSize="xl"
                                                                fontWeight="bold"
                                                                color="#000"
                                                                bg="#FFD700"
                                                                border="2px solid #000"
                                                                borderRadius="12px"
                                                                boxShadow="3px 3px 0 #000"
                                                                isLoading={pickLoading}
                                                                isDisabled={pickLoading}
                                                                onClick={() => handlePickLetter("A")}
                                                                _hover={{ bg: "#ffe066" }}
                                                            >
                                                                A
                                                            </Button>
                                                        </VStack>
                                                    );
                                                };

                                                if (treeState.phase === "await_a") {
                                                    return centerGameDiagram(renderAwaitStepOneFan());
                                                }

                                                if (treeState.phase === "playing") {
                                                    const options = lettersForStepNum(treeState.step);
                                                    if (branchPreview) {
                                                        return centerGameDiagram(
                                                            <AlphaTreeBranchPreview entry={branchPreview} />
                                                        );
                                                    }
                                                    if (
                                                        (options || []).length === 3 &&
                                                        prevLetter &&
                                                        treeState.step >= 2 &&
                                                        treeState.step <= 9
                                                    ) {
                                                        const resolvedValue =
                                                            lastPath?.letter === prevLetter &&
                                                            Number.isFinite(Number(lastPath?.value))
                                                                ? Number(lastPath.value)
                                                                : null;
                                                        const keyP =
                                                            treeState.step === 2 ? "play2" : `opt-${treeState.step}`;
                                                        const grid = renderFourPickGrid(
                                                            prevLetter,
                                                            resolvedValue,
                                                            options,
                                                            keyP
                                                        );
                                                        return centerGameDiagram(grid);
                                                    }
                                                    if (
                                                        treeState.step === 10 &&
                                                        (options || []).length === 1
                                                    ) {
                                                        const resolvedValue10 =
                                                            lastPath?.letter === prevLetter &&
                                                            Number.isFinite(Number(lastPath?.value))
                                                                ? Number(lastPath.value)
                                                                : null;
                                                        return centerGameDiagram(
                                                            renderStepTenGrid(
                                                                prevLetter || "",
                                                                resolvedValue10,
                                                                options[0],
                                                                `opt-${treeState.step}`
                                                            )
                                                        );
                                                    }
                                                    return (
                                                        <Flex wrap="nowrap" gap="18px" justify="center" align="flex-start">
                                                            <VStack minW="86px" minH={ALPHA_TREE_PICK_COL_MIN_H} justify="center" align="center">
                                                                {prevLetter
                                                                    ? renderResolvedButton(prevLetter, lastPath?.value)
                                                                    : null}
                                                            </VStack>
                                                            {renderLetterPickColumn(options || [], `opt-${treeState.step}`)}
                                                        </Flex>
                                                    );
                                                }

                                                if (treeState.phase === "await_cashout") {
                                                    return (
                                                        <VStack minH={ALPHA_TREE_PICK_COL_MIN_H} justify="center" align="center" spacing="6px">
                                                            {prevLetter ? renderResolvedButton(prevLetter, lastPath?.value) : null}
                                                        </VStack>
                                                    );
                                                }

                                                return null;
                                            })()}
                                        </>
                                    )}
                                    <AlphaTreeLetterDiagram
                                        phase={treeState.phase}
                                        step={treeState.step}
                                        pathSteps={pathSteps}
                                    />
                                </VStack>
                            )}
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px">
                    <AlphaTreeRealView />
                </GridItem>
            </Grid>
            <BetHistory />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent
                    bg="#2a2d2e"
                    border="1px solid rgba(0, 212, 255, 0.3)"
                    maxH="80vh"
                    h="auto"
                    overflowY="auto"
                    className="pumping-modal-content"
                >
                    <ModalHeader color="white" >
                        How to Play Alpha Tree Game
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody py="0" maxH="calc(80vh - 60px)" overflowY="auto" className="pumping-modal-body">
                        <Tabs colorScheme="cyan" variant="enclosed">
                            <TabList borderColor="rgba(0, 212, 255, 0.2)">
                                <Tab
                                    color="rgba(255,255,255,0.7)"
                                    _selected={{ color: '#00D4FF', borderColor: '#00D4FF' }}
                                    _hover={{ color: '#00D4FF' }}
                                >
                                    How to Play
                                </Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel py="24px">
                                    <VStack spacing="16px" align="stretch">
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                1. Bet and start
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Enter your stake and press Play Game. Step 1 is only the letter A — it
                                                always applies the configured base multiplier ({effectiveBase.toFixed(2)}) to your running total.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                2. Steps 2–9 and step 10
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Steps 2–9 show three letters. Each step,{" "}
                                                <Text as="span" fontWeight="bold">0</Text> (bust),{" "}
                                                <Text as="span" fontWeight="bold">(0.1, 1)</Text>, and{" "}
                                                <Text as="span" fontWeight="bold">(1, max)</Text> with max ={" "}
                                                {effectiveBase.toFixed(2)} ×
                                                2^(step−1) are <Text as="span" fontWeight="bold">randomly assigned</Text>{" "}
                                                to those three letters (order changes every step). Step 9: W, X, Y. Step
                                                10: only <Text as="span" fontWeight="bold">Z</Text> — fixed final multiplier from settings (≈{" "}
                                                {effectiveBase.toFixed(2)} × 2^9 with mode factors).
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                3. Cash out
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                After completing step 1, you can Cash Out anytime to collect your bet ×
                                                the current cumulative multiplier, or keep going to step 10. After the
                                                final step you must Cash Out to collect.
                                            </Text>
                                        </Box>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}