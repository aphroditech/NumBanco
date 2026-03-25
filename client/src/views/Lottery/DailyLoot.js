import React, { useState, useEffect, useMemo, useRef } from "react";
import { Flex, Text, Box } from "@chakra-ui/react";

import CardHeader from "components/Card/CardHeader.js";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";

import { useSelector, useDispatch } from "react-redux";
import { getClickData } from "action/LotteryActions";
// import diamond from "assets/badge/377.png";
import dia from "assets/badge/diamond.png";
import { formatTime } from "components/functions/format";
import { toast } from "react-toastify";
// Load loding page
import Loading from "components/Loading/Loading";

export default function Lottery() {
    const mountedRef = useRef(true);
    const timeoutRefs = useRef([]);
    const [clickLock, setClickLock] = useState(false);  // 🔒 API lock
    const [showFireworks, setShowFireworks] = useState(false);
    const [fireworksTotalEarn, setFireworksTotalEarn] = useState(0);
    const [wheelNumbers, setWheelNumbers] = useState([]);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);
    const [previousShowlottery, setPreviousShowlottery] = useState(null);
    const [newShowlottery, setNewShowlottery] = useState(null);

    const lootAvailable = useSelector((state) => state.user.lootAvailable);
    const lootRemainingMs = useSelector((state) => state.user.lootRemainingMs);

    useEffect(() => {
        // Reset display values on mount
        setPreviousShowlottery(null);
        setNewShowlottery(null);

        return () => {
            mountedRef.current = false;
            timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
        };
    }, []);

    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo);

    // Capture new showlottery value when it changes after API call
    useEffect(() => {
        if (previousShowlottery !== null && user?.showlottery !== undefined && user.showlottery !== previousShowlottery) {
            setNewShowlottery(user.showlottery);
        }
    }, [user?.showlottery, previousShowlottery]);
    const lotterybet = useSelector((state) => state.user.userInfo?.lotterybet);
    // const withdraw = user.membership === 0 ? 100 : (user.membership === 1 ? 10000 : 100000);

    // let lottery = (lotterybet / withdraw >= 1) ? user.membership === 0 ? 1 : (user.membership === 1 ? 50 : 200) : user.membership === 0 ? lotterybet / withdraw : (user.membership === 1 ? (lotterybet / withdraw) * 50 : (lotterybet / withdraw) * 200);
    let lottery = lotterybet*0.01;
    let bet = 0;
    const result = lottery - parseInt(lottery);
    if(result === 0) bet = lottery;
    else bet = lottery.toFixed(1);
    if (lottery < 0.1) 
    {
        bet = 0.1;
        lottery = 0.1;
    }
    const loading = useSelector((state) => state.user.loading);

    // const baseNumbers = useMemo(() => {
    //     if (user?.membership == 0) {
    //         return [6.7, 1, Number(lottery).toFixed(1), 0.8, 50.7, 200, 100.3, 40.2, 0.9];
    //     }
    //     if (user?.membership == 1) {
    //         return [0.2, 110.5, 200, 2, 43.5, 5, 18, 50, Number(lottery).toFixed(1)];
    //     }
    //     return [5, 10, 25.2, 1.5, Number(lottery).toFixed(1), 50.7, 100.5, 0.6, 200];
    // }, [user?.membership]);

    const baseNumbers = useMemo(() => {
        return [0.5, 500, 100, 50, 20, 15, 5, 0.2, bet];
    }, []);
    useEffect(() => {
        setWheelNumbers(shuffleArray(baseNumbers));
    }, [baseNumbers]);

    const shuffleArray = (array) => {
        return [...array].sort(() => Math.random() - 0.5);
    };

    useEffect(() => {
        setWheelNumbers(shuffleArray(baseNumbers));
    }, [baseNumbers]);

    const handleSpin = async () => {
        if (!lootAvailable) {
            toast.warning(`You have already played today. Please wait ${formatTime(lootRemainingMs)} before playing again.`);
            return;
        }
        // Prevent multiple clicks
        if (clickLock || hasSpun) return;
        setClickLock(true);
        setIsSpinning(true);

        // Capture previous showlottery value before API call
        const prevValue = user?.showlottery || 0;
        setPreviousShowlottery(prevValue);
        setNewShowlottery(null); // Reset new value for new spin

        // Don't validate date on client - let server handle it
        const body = {
            data: lottery.toFixed(1)
        };

        try {
            // Call API - server will validate
            // await getClickData(body, dispatch, false);

            // If successful, proceed with card flip animation
            const targetValue = Number(lottery.toFixed(1));
            const candidateIndexes = wheelNumbers
                .map((num, idx) => (Number(num) === targetValue ? idx : -1))
                .filter((idx) => idx >= 0);
            const targetIndex = candidateIndexes.length > 0
                ? candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)]
                : Math.floor(Math.random() * wheelNumbers.length);

            const segmentAngle = 360 / wheelNumbers.length;
            const targetRotation = -((targetIndex + 0.5) * segmentAngle);
            setWheelRotation((prev) => {
                const current = ((prev % 360) + 360) % 360;
                const delta = (targetRotation - current + 360) % 360;
                const spins = 5 * 360;
                return prev + spins + delta;
            });
            setHasSpun(true);

            // Call getClickData after circle stops spinning
            const timeoutGetClickData = setTimeout(async () => {
                if (mountedRef.current) {
                    try {
                        const apiRes = await getClickData(body, dispatch, false);

                        if (mountedRef.current) {
                            const lootAmt =
                                apiRes?.lootAmt ??
                                apiRes?.receivedBody?.data ??
                                body?.data ??
                                lottery.toFixed(1);

                            setFireworksTotalEarn(lootAmt);
                            setShowFireworks(true);

                            // Hide fireworks after a short burst
                            const timeoutHide = setTimeout(() => {
                                if (mountedRef.current) {
                                    setShowFireworks(false);
                                    setPreviousShowlottery(null);
                                    setNewShowlottery(null);
                                }
                            }, 3000);
                            timeoutRefs.current.push(timeoutHide);
                        }
                    } catch (err) {
                        console.error("Error calling getClickData after spin:", err);
                    }
                }
            }, 3500);
            console.log(timeoutGetClickData);
            timeoutRefs.current.push(timeoutGetClickData);

            const timeout2 = setTimeout(() => {
                if (mountedRef.current) {
                    setClickLock(false);
                    setIsSpinning(false);
                }
            }, 5000);
            timeoutRefs.current.push(timeout2);

        } catch (err) {
            // Error already handled in getClickData action
            if (mountedRef.current) {
                setClickLock(false);
                setIsSpinning(false);
            }
        }
    };

    if (loading) {
        return (
            <Box>
                <CardHeader mb="20px" ps="22px">
                    <Flex direction="column" alignSelf="flex-start">
                        <Text fontSize="lg" color="#fff" fontWeight="bold" mb="6px">
                            Lottery
                        </Text>
                    </Flex>
                </CardHeader>

                <Loading />
            </Box>
        );
    }

    console.log(user?.showlottery);

    return (
        <Box>
            <Box
                as="style"
                dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes wheelHalo {
                        0% { box-shadow: 0 0 18px rgba(59,130,246,0.25), inset 0 0 25px rgba(255,255,255,0.06); }
                        50% { box-shadow: 0 0 34px rgba(99,102,241,0.35), inset 0 0 32px rgba(255,255,255,0.08); }
                        100% { box-shadow: 0 0 18px rgba(59,130,246,0.25), inset 0 0 25px rgba(255,255,255,0.06); }
                    }
                    @keyframes pointerGlow {
                        0% { filter: drop-shadow(0 0 6px rgba(251,191,36,0.55)); }
                        50% { filter: drop-shadow(0 0 14px rgba(245,158,11,0.95)); }
                        100% { filter: drop-shadow(0 0 6px rgba(251,191,36,0.55)); }
                    }
                    @keyframes diamondSparkle {
                        0% { opacity: 0.35; transform: scale(0.9); }
                        50% { opacity: 0.9; transform: scale(1.1); }
                        100% { opacity: 0.35; transform: scale(0.9); }
                    }
                    @keyframes starShine {
                        0% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(251,191,36,0.6)); }
                        50% { transform: scale(1.08); filter: drop-shadow(0 0 10px rgba(251,191,36,0.95)); }
                        100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(251,191,36,0.6)); }
                    }
                    `,
                }}
            />
            <WinFireworksEffect
                isVisible={showFireworks}
                previousValue={null}
                currentValue={null}
                totalEarn={fireworksTotalEarn}
                duration={1200}
            />

            <Flex direction="column" align="center" gap={6} p={10}>
                <Box
                    position="relative"
                    w="520px"
                    h="520px"
                    top="50%"
                    bg="#0b0f1d"
                    borderRadius="50%"
                    boxShadow="0 0 40px rgba(59,130,246,0.25), inset 0 0 35px rgba(255,255,255,0.06)"
                    border="1px solid rgba(148,163,184,0.2)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    animation="wheelHalo 3.8s ease-in-out infinite"
                >
                    <Box
                        position="absolute"
                        inset="12px"
                        borderRadius="50%"
                        border="1px solid rgba(148,163,184,0.15)"
                        boxShadow="inset 0 0 18px rgba(14,165,233,0.15)"
                    />
                    <Box position="absolute" top="-20px" left="50%" transform="translateX(-50%)" zIndex={3}>
                        <Box
                            as="svg"
                            width="68px"
                            height="100px"
                            viewBox="0 0 50 74"
                            style={{ filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.35))" }}
                        >
                            <defs>
                                <linearGradient id="pointerBody" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#00d4ff" />
                                    <stop offset="45%" stopColor="#00bfe8" />
                                    <stop offset="100%" stopColor="#009fc2" />
                                </linearGradient>
                                <linearGradient id="pointerEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(0,212,255,0.95)" />
                                    <stop offset="100%" stopColor="rgba(0,159,194,0.6)" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M25 4 C14 4 6 12 6 23 C6 38 18 52 25 70 C32 52 44 38 44 23 C44 12 36 4 25 4 Z"
                                fill="url(#pointerBody)"
                                stroke="url(#pointerEdge)"
                                strokeWidth="1.5"
                            />
                            <path
                                d="M25 12 C19 12 13 18 13 24 C13 32 20 40 25 54 C30 40 37 32 37 24 C37 18 31 12 25 12 Z"
                                fill="rgba(255,255,255,0.4)"
                            />
                            {/* <image
                                href={diamond}
                                x="15"
                                y="14"
                                width="20"
                                height="20"
                                preserveAspectRatio="xMidYMid meet"
                                alt="NumBanco Diamond Pointer"
                            /> */}
                        </Box>
                    </Box>

                    <Box
                        as="svg"
                        width="460px"
                        height="460px"
                        viewBox="0 0 320 320"
                        borderRadius="50%"
                        transform={`rotate(${wheelRotation}deg)`}
                        transition={isSpinning ? "transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none"}
                        style={{ filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.35))", pointerEvents: "none" }}
                    >
                        <defs>
                            <radialGradient id="wheelFace" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#0f172a" />
                                <stop offset="60%" stopColor="#0b1120" />
                                <stop offset="100%" stopColor="#050812" />
                            </radialGradient>
                            <radialGradient id="wheelRim" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#1e293b" />
                                <stop offset="70%" stopColor="#0b1120" />
                                <stop offset="100%" stopColor="#020617" />
                            </radialGradient>
                            <linearGradient id="rimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(168,85,247,0.6)" />
                                <stop offset="50%" stopColor="rgba(59,130,246,0.5)" />
                                <stop offset="100%" stopColor="rgba(168,85,247,0.6)" />
                            </linearGradient>
                            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feOffset dx="0" dy="2" />
                                <feGaussianBlur stdDeviation="4" result="shadow" />
                                <feComposite in="shadow" in2="SourceAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.6 0" />
                                <feBlend in="SourceGraphic" mode="normal" />
                            </filter>
                            {wheelNumbers.map((_, index) => {
                                const hue = (index * 360) / wheelNumbers.length;
                                return (
                                    <linearGradient
                                        key={`segGrad-${index}`}
                                        id={`segGrad-${index}`}
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="100%"
                                    >
                                        <stop offset="0%" stopColor={`hsl(${hue}, 85%, 55%)`} />
                                        <stop offset="50%" stopColor={`hsl(${hue}, 85%, 45%)`} />
                                        <stop offset="100%" stopColor={`hsl(${hue}, 85%, 35%)`} />
                                    </linearGradient>
                                );
                            })}
                        </defs>
                        <circle cx="160" cy="160" r="158" fill="url(#wheelRim)" />
                        <circle cx="160" cy="160" r="150" fill="url(#wheelFace)" />
                        <circle cx="160" cy="160" r="152" fill="none" stroke="url(#rimGlow)" strokeWidth="3" />
                        <path
                            d="M60 80 A120 120 0 0 1 200 50"
                            stroke="rgba(255,255,255,0.18)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <circle cx="160" cy="160" r="140" fill="rgba(255,255,255,0.03)" />
                        {wheelNumbers.map((_, index) => {
                            const angle = -Math.PI / 2 + index * ((2 * Math.PI) / wheelNumbers.length);
                            const x = 160 + 158 * Math.cos(angle);
                            const y = 160 + 158 * Math.sin(angle);
                            return (
                                <circle
                                    key={`rim-${index}`}
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="rgba(255,255,255,0.55)"
                                />
                            );
                        })}
                        {wheelNumbers.map((_, index) => {
                            const angle = -Math.PI / 2 + index * ((2 * Math.PI) / wheelNumbers.length);
                            const xOuter = 160 + 150 * Math.cos(angle);
                            const yOuter = 160 + 150 * Math.sin(angle);
                            const xInner = 160 + 135 * Math.cos(angle);
                            const yInner = 160 + 135 * Math.sin(angle);
                            return (
                                <line
                                    key={`tick-${index}`}
                                    x1={xInner}
                                    y1={yInner}
                                    x2={xOuter}
                                    y2={yOuter}
                                    stroke="rgba(255,255,255,0.25)"
                                    strokeWidth="2"
                                />
                            );
                        })}
                        {wheelNumbers.map((num, index) => {
                            const segmentAngle = (2 * Math.PI) / wheelNumbers.length;
                            const startAngle = -Math.PI / 2 + index * segmentAngle;
                            const endAngle = startAngle + segmentAngle;
                            const largeArc = segmentAngle > Math.PI ? 1 : 0;
                            const x1 = 160 + 150 * Math.cos(startAngle);
                            const y1 = 160 + 150 * Math.sin(startAngle);
                            const x2 = 160 + 150 * Math.cos(endAngle);
                            const y2 = 160 + 150 * Math.sin(endAngle);
                            const textAngle = startAngle + segmentAngle / 2;
                            const textX = 160 + 95 * Math.cos(textAngle);
                            const textY = 160 + 95 * Math.sin(textAngle);
                            return (
                                <g key={index}>
                                    <path
                                        d={`M160,160 L${x1},${y1} A150,150 0 ${largeArc} 1 ${x2},${y2} Z`}
                                        fill={`url(#segGrad-${index})`}
                                        stroke="rgba(255,255,255,0.35)"
                                        strokeWidth="2"
                                        filter="url(#innerShadow)"
                                    />
                                    <text
                                        x={textX}
                                        y={textY}
                                        fill="#f8fafc"
                                        fontSize="14"
                                        fontWeight="700"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        transform={`rotate(${(textAngle * 180) / Math.PI} ${textX} ${textY})`}
                                    >
                                        {num}
                                    </text>
                                </g>
                            );
                        })}
                    </Box>
                    <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        zIndex={2}
                        cursor={clickLock || hasSpun ? "not-allowed" : "pointer"}
                        onClick={handleSpin}
                        pointerEvents="auto"
                    >
                        <Box as="svg" width="190px" height="190px" viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r="28" fill="#0b0f1d" />
                            <circle cx="70" cy="70" r="24" fill="#111827" />
                            <circle cx="70" cy="70" r="20" fill="#0f172a" />
                            <image
                                href={dia}
                                x="46"
                                y="46"
                                width="50"
                                height="50"
                                preserveAspectRatio="xMidYMid meet"
                                pointerEvents="none"
                                alt="NumBanco Diamond"
                            />
                        </Box>
                    </Box>
                </Box>

                {/* <Box
                    as="button"
                    onClick={handleSpin}
                    disabled={clickLock || hasSpun}
                    px="22px"
                    py="10px"
                    borderRadius="12px"
                    background="#1f2937"
                    color="#fff"
                    fontWeight="600"
                    opacity={clickLock || hasSpun ? 0.6 : 1}
                >
                    {clickLock ? "Spinning..." : hasSpun ? "Completed" : "Click"}
                </Box> */}

                {/* <ClickButton
                    backgroundColor="#fff"
                    label={clickLock ? "Spinning..." : hasSpun ? "Completed" : "Click"}
                    width="50%"
                    onClick={handleSpin}
                    disabled={clickLock || hasSpun}
                /> */}
            </Flex>
        </Box>
    );
}