import {
    Box,
    Flex,
    Grid,
    GridItem,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    IconButton,
    useMediaQuery,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import sky from 'assets/img/Coco/sky.png';
import egg from 'assets/img/Coco/egg.png';
import chicken from 'assets/img/Coco/chicken.png';
import chickenHit from 'assets/img/Coco/chicken_hit.png';
import chickenStand from 'assets/img/Coco/chicken_stand.png';
import eggBreak from 'assets/img/Coco/broken_egg.png';
import eggCrack from 'assets/img/Coco/cracked_egg.png';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { cocoSmash, cocoRestart } from 'action/CocoActions';
import { onlineUser, offlineUser } from 'action/BetActions';
import { getUserData } from 'action';
import CocoRealView from './CocoItem/CocoRealView';
import CocoBetHistory from './CocoItem/BetHistory';
import PaidIcon from "@mui/icons-material/Paid";
import cloud from 'assets/img/Coco/cloud.png';
import sky1 from 'assets/img/Coco/sky1.png';

/** Chicken stays here except short jump on smash */
const CHICKEN_BOTTOM_IDLE = 260;
/** One vertical slot for eggs (width 100, overlap -16 between rows) */
const EGG_SLOT_LIFT_PX = 48;
/** How far clouds move up each normal break (can differ from egg slot) */
const CLOUD_RISE_PER_BREAK_PX = 48;
const EGG_TOWER_COUNT = 7;  
/** egg1 breaks → remove egg1, egg2–egg7 rise (gap at old egg7 spot) → new egg fills bottom */
const EGG_NORMAL_REMOVE_TOP_MS = 380;
/** Pause so empty bottom slot is visible before new egg7 appears */
const EGG_NORMAL_ADD_BOTTOM_RISE_MS = 180;
/** Big multi (final): chicken lands here; eggs all break then cleared */
const CHICKEN_LAND_BOTTOM = 22;
const BIG_MULTI_BREAK_EACH_MS = 130;
const BIG_MULTI_CLEAR_EGGS_MS = BIG_MULTI_BREAK_EACH_MS * EGG_TOWER_COUNT + 120;
const BIG_MULTI_CHICKEN_DOWN_MS = 900;
/**
 * One vertical loop (px). Taller than typical sky so each cycle has empty sky on top
 * and clouds only in the lower band — recycled clouds enter from bottom and rise.
 */
const CLOUD_LOOP_PX = 520;
/** Bottom of sky: clouds fade in while rising (emerge from land). Stops = opaque → soft → clear */
const CLOUD_LAND_MASK =
    'linear-gradient(to bottom, #000 0%, #000 70%, rgba(0,0,0,0.35) 84%, transparent 100%)';
/** Smooth motion for egg gap + cloud scroll */
const EGG_TOWER_SMOOTH_MS = 120;
const CLOUD_SCROLL_SMOOTH_MS = 480;
/**
 * `top` is offset from each band’s start (0, CLOUD_LOOP_PX, …).
 * Keep values in the lower ~35% of the band so repeats rise from below, not mid-sky.
 */
const CLOUD_SLOTS = [
    { left: '6%', top: 300, w: 88, opacity: 0.92 },
    { left: '42%', top: 355, w: 110, opacity: 0.88 },
    { left: '74%', top: 318, w: 76, opacity: 0.9 },
];

/** All in-scene pixel positions/sizes are authored for this width; scene scales to fit container */
const COCO_SCENE_DESIGN_WIDTH = 900;
/** Fallback height until sky.png reports natural dimensions */
const COCO_SCENE_DEFAULT_HEIGHT = 506;

function positiveMod(n, m) {
    return ((n % m) + m) % m;
}

export default function CocoPage() {
    const [chickenBottom, setChickenBottom] = useState(CHICKEN_BOTTOM_IDLE);
    const [amount, setAmount] = useState('0.2');
    const amountRef = useRef('0.2');

    const [restartCoverOn, setRestartCoverOn] = useState(false);
    const restartCoverTimerRef = useRef(null);
    const restartCalledRef = useRef(false);

    useEffect(() => {
        return () => {
            if (restartCoverTimerRef.current) {
                clearTimeout(restartCoverTimerRef.current);
            }
        };
    }, []);

    const setAmountSafe = (next) => {
        amountRef.current = String(next);
        setAmount(String(next));
    };

    const handleAmountInputChange = (raw) => {
        // Allow empty while typing, or numbers with up to 2 decimals.
        if (raw === '') {
            setAmountSafe('');
            return;
        }
        if (!/^\d*\.?\d{0,2}$/.test(raw)) return;

        // Clamp max so the UI can't exceed the expected range.
        const num = Number(raw);
        if (Number.isFinite(num) && num > 20) {
            setAmountSafe('20.00');
            return;
        }

        setAmountSafe(raw);
    };

    const handleAmountInputBlur = () => {
        const num = Number(amountRef.current);
        if (!Number.isFinite(num) || num <= 0) {
            setAmountSafe('0.00');
            return;
        }
        const clamped = Math.min(20, num);
        setAmountSafe(clamped.toFixed(2));
    };

    const [animState, setAnimState] = useState("idle");
    const [eggs, setEggs] = useState(() => Array(EGG_TOWER_COUNT).fill("normal"));
    /** Stable keys so shift+push (recycle tower) doesn’t reuse wrong egg DOM */
    const eggKeySeqRef = useRef(EGG_TOWER_COUNT);
    const [eggRowKeys, setEggRowKeys] = useState(() =>
        Array.from({ length: EGG_TOWER_COUNT }, (_, i) => i)
    );
    const [towerOffset, setTowerOffset] = useState(0);
    /** Clouds only: loops in sky layer */
    const [sceneRisePx, setSceneRisePx] = useState(0);
    /**
     * Legacy translate lift (big multi / edge cases). Normal hits use bottom gap instead.
     */
    const [eggStackLiftPx, setEggStackLiftPx] = useState(0);
    /** Empty slot height (px) under egg7 before new egg is pushed — keeps egg7 screen position */
    const [eggBottomGapPx, setEggBottomGapPx] = useState(0);
    /** When true: padding-bottom snaps (no tween) so closing gap + new egg doesn’t move tower again */
    const [eggGapCloseInstant, setEggGapCloseInstant] = useState(false);
    /** Cloud loop wrap: disable transform transition for one frame (avoid wrong tween across mod) */
    const [cloudInstantMove, setCloudInstantMove] = useState(false);
    const prevSceneRiseRef = useRef(0);
    const [shakeX, setShakeX] = useState(0);

    useLayoutEffect(() => {
        const prev = prevSceneRiseRef.current;
        const next = sceneRisePx;
        if (prev === next) return;
        const wrapped =
            next > prev &&
            positiveMod(next, CLOUD_LOOP_PX) < positiveMod(prev, CLOUD_LOOP_PX);
        prevSceneRiseRef.current = next;
        if (wrapped) {
            setCloudInstantMove(true);
            const id = requestAnimationFrame(() => {
                requestAnimationFrame(() => setCloudInstantMove(false));
            });
            return () => cancelAnimationFrame(id);
        }
    }, [sceneRisePx]);
    const dispatch = useDispatch();
    const history = useHistory();
    useEffect(() => {
        onlineUser(8);
        getUserData(dispatch);
        return () => {
            offlineUser(8);
        };
    }, [dispatch]);
    const [latestWin, setLatestWin] = useState('0.00');
    const [latestMulti, setLatestMulti] = useState('0.00');
    const [latestCombo, setLatestCombo] = useState('0');
    const [loading, setLoading] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    /** Same as Rocket Shot: stacked below 1800px, side‑by‑side at 1800px+ */
    const [isNarrowLayout] = useMediaQuery('(max-width: 1799px)');
    const sceneMeasureRef = useRef(null);
    const skyImgRef = useRef(null);
    const [cocoSceneScale, setCocoSceneScale] = useState(1);
    const [cocoDesignHeight, setCocoDesignHeight] = useState(COCO_SCENE_DEFAULT_HEIGHT);

    const applySkyNaturalSize = (img) => {
        if (!img || !img.naturalWidth) return;
        setCocoDesignHeight(
            (img.naturalHeight * COCO_SCENE_DESIGN_WIDTH) / img.naturalWidth
        );
    };

    useLayoutEffect(() => {
        const img = skyImgRef.current;
        if (img?.complete) applySkyNaturalSize(img);
    }, []);

    useLayoutEffect(() => {
        const el = sceneMeasureRef.current;
        if (!el) return;

        let rafId = 0;

        const update = () => {
            const w = el.getBoundingClientRect().width;
            if (w <= 0) return;
            const s = w / COCO_SCENE_DESIGN_WIDTH;
            setCocoSceneScale(Math.min(Math.max(s, 0.2), 4));
        };

        // Defer to next frame so we don't setState inside the same turn as ResizeObserver
        // (avoids "ResizeObserver loop completed with undelivered notifications" in dev).
        const scheduleUpdate = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                update();
            });
        };

        scheduleUpdate();
        const ro = new ResizeObserver(() => scheduleUpdate());
        ro.observe(el);
        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
        };
    }, []);

    const isLandingSky =
        animState === "finalDown" ||
        animState === "finalStand" ||
        animState === "showMulti";
    const user = useSelector((state) => state.user.userInfo) || {};
    const cocoHistory = Array.isArray(user?.cocoHistory) ? user.cocoHistory : [];
    const balance = Number(user?.balance ?? 0);
    const username = user?.username ?? 'User';
    const displayName = username.length > 12 ? username.slice(0, 8) + '...' : username;
    const getChickenImg = () => {

        if (animState === "jump") return chickenHit;
    
        if (animState === "hit") return chickenHit;
    
        if (animState === "finalDown") return chickenHit;
    
        if (animState === "finalStand") return chickenStand;
    
        if (animState === "showMulti") return chickenStand;
    
        return chicken;
    };

    useEffect(() => {

        if (animState !== "shake") return;
    
        let i = 0;
    
        const id = setInterval(() => {
    
            setShakeX(i % 2 === 0 ? -6 : 6);
            i++;
    
        }, 40); // speed of shake
    
        setTimeout(() => {
            clearInterval(id);
            setShakeX(0);
        }, 300); // duration of shake
    
        return () => clearInterval(id);
    
    }, [animState]);
    const handleSmash = async () => {
        const betAmount = Number(amountRef.current);
    
        if (!betAmount || betAmount <= 0) {
            toast.error("Enter a valid bet amount");
            return;
        }
    
        if (betAmount > balance) {
            toast.error("Insufficient balance");
            return;
        }
    
        setLoading(true);
    
        try {
    
            // start jump
            setAnimState("jump");
            setChickenBottom(CHICKEN_BOTTOM_IDLE + 80);
            
            // call API at same time (important)
            const smashPromise = cocoSmash(
                { betAmount },
                dispatch,
                history
            );
    
            // go to hit quickly
            setTimeout(() => {
                setAnimState("hit");
                setChickenBottom(CHICKEN_BOTTOM_IDLE);
            }, 160);
    
            // wait result
            const data = await smashPromise;
    
            const multi = data?.multi ?? 0;

            const isFinal = multi >= 3.5; // your final range
    
            // start result immediately after hit
            setTimeout(() => {
    
                if (multi === 0) {

                    setAnimState("shake");

                    setTimeout(() => {

                        setEggs((prev) => {
                            const copy = [...prev];
                            copy[0] = "cracked";
                            return copy;
                        });

                        setAnimState("idle");

                    }, 200);
    
                } 
                else {

                    if (multi >= 3.5) {
                        // Big multi: chicken descends to land; every egg breaks then tower is cleared
                        setAnimState("finalDown");
                        // Break eggs one-by-one as chicken moves down.
                        // This makes it look like the chicken "passes" each egg.
                        setEggs((prev) => prev.map(() => "normal"));
                        let brokenCount = 0;
                        // Start breaking right when chicken starts its descent.
                        setTimeout(() => {
                            const breakTimer = setInterval(() => {
                                brokenCount += 1;
                                setEggs((prev) =>
                                    prev.map((s, idx) =>
                                        idx < brokenCount ? "break" : s
                                    )
                                );

                                if (brokenCount >= EGG_TOWER_COUNT) {
                                    clearInterval(breakTimer);
                                }
                            }, BIG_MULTI_BREAK_EACH_MS);
                        }, 40);

                        setTimeout(() => {
                            setChickenBottom(CHICKEN_LAND_BOTTOM);
                        }, 40);

                        setTimeout(() => {
                            setEggs([]);
                            setEggRowKeys([]);
                            setEggStackLiftPx(0);
                            setSceneRisePx(
                                (prev) => prev + CLOUD_RISE_PER_BREAK_PX * 2
                            );
                        }, BIG_MULTI_CLEAR_EGGS_MS);

                        setTimeout(() => {
                            setAnimState("finalStand");
                        }, BIG_MULTI_CHICKEN_DOWN_MS);

                        setTimeout(() => {
                            setAnimState("showMulti");
                        }, BIG_MULTI_CHICKEN_DOWN_MS + 280);

                        setTimeout(() => {
                            if (!restartCalledRef.current) {
                                restartCalledRef.current = true;
                                handleRestart();
                            }
                        }, BIG_MULTI_CHICKEN_DOWN_MS + 1200);
                    } else {
                
                        // normal hit
                
                        setAnimState("break");
                
                        setEggs((prev) => {
                            const copy = [...prev];
                            copy[0] = "break";
                            return copy;
                        });
                
                        setTimeout(() => {
                            setAnimState("remove");
                        }, 120);

                        // 1) egg1 gone → egg2..egg7 rise (smooth gap open); tower stays there after this.
                        setTimeout(() => {
                            setEggGapCloseInstant(false);
                            setAnimState("idle");
                            setEggs((prev) => {
                                const copy = [...prev];
                                if (copy.length > 0) {
                                    copy.shift();
                                }
                                return copy;
                            });
                            setEggRowKeys((prev) => {
                                return prev.slice(1);
                            });
                            setEggBottomGapPx(EGG_SLOT_LIFT_PX);
                            setSceneRisePx(
                                (prev) => prev + CLOUD_RISE_PER_BREAK_PX
                            );
                        }, EGG_NORMAL_REMOVE_TOP_MS);

                        // 2) New egg under egg7; snap gap shut (no padding animation) so e2–e7 don’t shift again.
                        setTimeout(() => {
                            setEggGapCloseInstant(true);
                            setEggs((prev) => [...prev, "normal"]);
                            setEggRowKeys((prev) => [
                                ...prev,
                                eggKeySeqRef.current++,
                            ]);
                            setEggBottomGapPx(0);
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() =>
                                    setEggGapCloseInstant(false)
                                );
                            });
                        }, EGG_NORMAL_REMOVE_TOP_MS + EGG_NORMAL_ADD_BOTTOM_RISE_MS);
                    }
                }
    
            }, 150);
    
            setLatestWin((data?.lastWin ?? 0).toFixed(2));
            setLatestMulti((data?.multi ?? 0).toFixed(2));
            setLatestCombo(String(data?.combo ?? 0));
    
        } catch (err) {
    
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Smash failed";
    
            toast.error(msg);
    
        } finally {
    
            setLoading(false);
    
        }
    };

    const handleRestart = async () => {
        restartCalledRef.current = false;
        if (restartCoverOn) return;

        setRestartCoverOn(true);
        try {
            // Reset local UI immediately (eggs back to start state)
            setAnimState("idle");
            setEggs(Array(EGG_TOWER_COUNT).fill("normal"));
            eggKeySeqRef.current = EGG_TOWER_COUNT;
            setEggRowKeys(Array.from({ length: EGG_TOWER_COUNT }, (_, i) => i));
            setTowerOffset(0);
            setSceneRisePx(0);
            prevSceneRiseRef.current = 0;
            setEggStackLiftPx(0);
            setEggBottomGapPx(0);
            setEggGapCloseInstant(false);
            setShakeX(0);

            await cocoRestart(dispatch, history);
            setLatestWin('0.00');
            setLatestMulti('0.00');
            setLatestCombo('0');
            setChickenBottom(CHICKEN_BOTTOM_IDLE);
            toast.success('New game started');
        } catch (err) {
            const msg = err.response?.data?.error || 'Restart failed';
            toast.error(msg);
        } finally {
            // Keep the cover visible briefly even if API returns fast.
            if (restartCoverTimerRef.current) {
                clearTimeout(restartCoverTimerRef.current);
            }
            restartCoverTimerRef.current = setTimeout(() => {
                setRestartCoverOn(false);
            }, 650);
        }
    };
    return (
        <Box minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            {/* Same inset + grid behavior as Rocket Shot (game | realView) */}
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
                    <GridItem area="game" minW={0}>
                        <Card w="100%" h="auto">
                        <CardBody p={0}>
                            <div
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <Box
                                    ref={sceneMeasureRef}
                                    position="relative"
                                    w="100%"
                                    minW={0}
                                    alignSelf="stretch"
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: cocoDesignHeight * cocoSceneScale,
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '50%',
                                                top: 0,
                                                width: COCO_SCENE_DESIGN_WIDTH,
                                                height: cocoDesignHeight,
                                                marginLeft: -COCO_SCENE_DESIGN_WIDTH / 2,
                                                transform: `scale(${cocoSceneScale})`,
                                                transformOrigin: 'top center',
                                                willChange: 'transform',
                                            }}
                                        >
                                    {/* Restart fog cover (limited to the sky image area) */}
                                    <Box
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        w="100%"
                                        h="100%"
                                        zIndex={2000}
                                        opacity={restartCoverOn ? 1 : 0}
                                        transform={restartCoverOn ? 'scale(1)' : 'scale(0.98)'}
                                        transition="opacity 250ms ease, transform 250ms ease"
                                        pointerEvents={restartCoverOn ? 'auto' : 'none'}
                                        bg="rgba(0,0,0,0.30)"
                                        backdropFilter={restartCoverOn ? 'blur(10px)' : 'blur(0px)'}
                                        style={{ willChange: 'opacity, transform' }}
                                    >
                                        <img
                                            src={sky}
                                            alt=""
                                            aria-hidden="true"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                filter: 'blur(18px)',
                                                transform: 'scale(1.05)',
                                                opacity: 0.35,
                                            }}
                                        />
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background:
                                                    'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.65))',
                                            }}
                                        />
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: 'relative',
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                                fontSize: 18,
                                                letterSpacing: 0.5,
                                                textAlign: 'center',
                                            }}
                                        >
                                            Restarting...
                                        </div>
                                    </Box>
                                    {/* SKY IMAGE (crossfade to sky1 when chicken lands on big multi) */}
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <img
                                            ref={skyImgRef}
                                            src={sky}
                                            alt="sky"
                                            onLoad={(e) => applySkyNaturalSize(e.currentTarget)}
                                            style={{ width: '100%', display: 'block' }}
                                        />
                                        <img
                                            src={sky1}
                                            alt="sky landing"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                opacity: isLandingSky ? 1 : 0,
                                                transition: 'opacity 650ms ease',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    </div>

                                    {/* Clouds: scroll up with breaks; loop so clouds exit top and re-enter from bottom */}
                                    <div
                                        aria-hidden
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            pointerEvents: 'none',
                                            zIndex: 1,
                                            overflow: 'hidden',
                                            WebkitMaskImage: CLOUD_LAND_MASK,
                                            maskImage: CLOUD_LAND_MASK,
                                            WebkitMaskSize: '100% 100%',
                                            maskSize: '100% 100%',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskRepeat: 'no-repeat',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                height: CLOUD_LOOP_PX * 2,
                                                top: 0,
                                                transform: `translateY(-${positiveMod(
                                                    sceneRisePx,
                                                    CLOUD_LOOP_PX
                                                )}px)`,
                                                transition: cloudInstantMove
                                                    ? 'none'
                                                    : `transform ${CLOUD_SCROLL_SMOOTH_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`,
                                            }}
                                        >
                                            {[0, CLOUD_LOOP_PX].map((bandTop) =>
                                                CLOUD_SLOTS.map((slot, slotIdx) => (
                                                    <img
                                                        key={`${bandTop}-${slotIdx}`}
                                                        src={cloud}
                                                        alt=""
                                                        style={{
                                                            position: 'absolute',
                                                            left: slot.left,
                                                            top: bandTop + slot.top,
                                                            width: slot.w,
                                                            opacity: slot.opacity,
                                                            filter:
                                                                'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                                                        }}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* TOP BAR inside sky */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '2%',
                                            left: '2%',
                                            right: '2%',
                                            zIndex: 5,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        {/* Profile LEFT */}
                                        {/* <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                background: '#fff',
                                                border: '2px solid #000',
                                                borderRadius: 8,
                                                padding: '6px 10px',
                                            }}
                                        >
                                            <img
                                                src={user?.avatar || 'https://via.placeholder.com/40'}
                                                alt=""
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                }}
                                            />

                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 'bold' }}>
                                                    {displayName}
                                                </div>
                                                <div style={{ fontSize: 12 }}>
                                                    🪙 {balance.toLocaleString()}
                                                </div>
                                            </div>
                                        </div> */}

                                        {/* Help + Menu RIGHT */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <IconButton
                                                aria-label="Help"
                                                icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                                                size="sm"
                                                bg="transparent"
                                                color="#00d4ff"
                                                borderRadius="50%"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)', color: '#00D4FF' }}
                                                onClick={() => setIsHelpModalOpen(true)}
                                            />
                                        </div>
                                    </div>
                                                
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '2%',
                                            left: '50%',
                                            zIndex: 5,
                                            transform: 'translateX(-50%)',
                                            background: '#000',
                                            border: '3px solid #FFD700',
                                            borderRadius: 12,
                                            padding: '6px 20px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 20,
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            LATEST WIN
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 18,
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <PaidIcon sx={{ color: "#FFD700" }} />
                                            {latestWin}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '2%',
                                            left: '20%',
                                            zIndex: 5,
                                            transform: 'translateX(-50%)',
                                            background: '#000',
                                            border: '3px solid #FFD700',
                                            borderRadius: 12,
                                            padding: '6px 10px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            LATEST MULTI
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 14,
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            x{latestMulti}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '2%',
                                            left: '80%',
                                            zIndex: 5,
                                            transform: 'translateX(-50%)',
                                            background: '#000',
                                            border: '3px solid #FFD700',
                                            borderRadius: 12,
                                            padding: '6px 20px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            COMBO
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 14,
                                                color: '#FFD700',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {latestCombo}
                                        </div>
                                    </div>

                                    {/* Eggs tower */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: 20,
                                            left: "50%",
                                            zIndex: 3,
                                            boxSizing: "border-box",
                                            transform: `translate(-50%, ${
                                                towerOffset - eggStackLiftPx
                                            }px)`,
                                            transition: eggGapCloseInstant
                                                ? "padding-bottom 0s linear, transform 0.35s ease-out"
                                                : `padding-bottom ${EGG_TOWER_SMOOTH_MS}ms cubic-bezier(0.33, 1, 0.68, 1), transform 0.35s ease-out`,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "flex-end",
                                            paddingBottom: eggBottomGapPx,
                                        }}
                                    >
                                        {eggs.map((state, i) => {

                                            const isTop = i === 0;

                                            let srcImg = egg;

                                            if (state === "cracked") {
                                                srcImg = eggCrack;
                                            }

                                            if (state === "break") {
                                                srcImg = eggBreak;
                                            }

                                            return (
                                                <img
                                                    key={eggRowKeys[i] ?? i}
                                                    src={srcImg}
                                                    style={{
                                                        width: 100,
                                                        marginTop: i === 0 ? 0 : -16,

                                                        transform:
                                                            isTop && animState === "shake"
                                                                ? `translateX(${shakeX}px)`
                                                                : "translateX(0)",

                                                        transition: "all 0.1s",

                                                        opacity:
                                                            isTop && animState === "remove"
                                                                ? 0
                                                                : 1,
                                                    }}
                                                />
                                            );
                                            })
                                        }
                                    </div>

                                    {/* Chicken */}
                                    <img
                                        src={getChickenImg()}
                                        style={{
                                            position: "absolute",
                                            left: "50%",
                                            zIndex: 4,
                                            width: 200,
                                            transition:
                                                animState === "finalDown" ||
                                                animState === "finalStand" ||
                                                animState === "showMulti"
                                                    ? "bottom 0.95s cubic-bezier(0.33, 1, 0.68, 1)"
                                                    : "all 0.2s linear",

                                            bottom: chickenBottom,

                                            transform: "translateX(-50%)",
                                        }}
                                    />

                                    {/* Bottom controls inside sky image */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 10,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 12px',
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            borderRadius: 12,
                                            border: '2px solid #000',
                                            zIndex: 5,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#000',
                                                border: '1px solid rgba(255,255,255,0.4)',
                                                borderRadius: 24,
                                                padding: '6px 10px',
                                                gap: 10,
                                                minWidth: 140,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                aria-label="Previous amount"
                                                onClick={() => {
                                                    const val = parseFloat(amountRef.current) || 0;
                                                    const next = Math.max(0, val - 0.2).toFixed(2);
                                                    setAmountSafe(next);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: 4,
                                                    color: '#fff',
                                                }}
                                            >
                                                ‹
                                            </button>
                                            <input
                                                aria-label="Set bet amount"
                                                type="text"
                                                inputMode="decimal"
                                                value={amount}
                                                disabled={loading}
                                                onChange={(e) =>
                                                    handleAmountInputChange(e.target.value)
                                                }
                                                onBlur={handleAmountInputBlur}
                                                placeholder="0.20"
                                                style={{
                                                    width: 90,
                                                    textAlign: 'center',
                                                    fontWeight: 'bold',
                                                    fontSize: 16,
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,0.35)',
                                                    background: '#fff',
                                                    padding: '6px 8px',
                                                    outline: 'none',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                aria-label="Next amount"
                                                onClick={() => {
                                                    const val = parseFloat(amountRef.current) || 0;
                                                    const next = Math.min(20, val + 0.2).toFixed(2);
                                                    setAmountSafe(next);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: 4,
                                                    color: '#fff',
                                                }}
                                            >
                                                ›
                                            </button>
                                        </div>

                                        <button
                                            onClick={handleSmash}
                                            disabled={loading}
                                            style={{
                                                // Keep button width stable when toggling between
                                                // "SMASH" and "..." during loading.
                                                minWidth: 90,
                                                whiteSpace: 'nowrap',
                                                padding: '8px 16px',
                                                fontSize: 14,
                                                fontWeight: 'bold',
                                                color: '#000',
                                                background: loading ? '#ccc' : '#FFD700',
                                                border: '2px solid #000',
                                                borderRadius: 10,
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                boxShadow: '2px 2px 0 #000',
                                            }}
                                        >
                                            {loading ? '...' : 'SMASH'}
                                        </button>

                                        {/* <button
                                            onClick={handleRestart}
                                            disabled={restartCoverOn}
                                            style={{
                                                padding: '8px 16px',
                                                fontSize: 14,
                                                fontWeight: 'bold',
                                                color: '#000',
                                                background: restartCoverOn ? '#ccc' : '#FFD700',
                                                border: '2px solid #000',
                                                borderRadius: 10,
                                                cursor: restartCoverOn ? 'not-allowed' : 'pointer',
                                                boxShadow: '2px 2px 0 #000',
                                            }}
                                        >
                                            RESTART
                                        </button> */}
                                    </div>
                                        </div>
                                    </div>
                                </Box>
                            </div>
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
                            <CocoRealView />
                        </Box>
                    </GridItem>
                </Grid>

                {/* Coco Help Modal */}
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
                            Coco Game Description
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
                            <Box color="rgba(255,255,255,0.85)" fontSize="sm" mb="16px">
                                Smash to break eggs. Each successful break increases your
                                combo and multiplier:
                            </Box>

                            <Box
                                border="1px solid rgba(0, 212, 255, 0.2)"
                                borderRadius="12px"
                                overflow="hidden"
                                mb="16px"
                            >
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '12px', color: '#00D4FF', fontSize: 12 }}>
                                                Combo
                                            </th>
                                            <th style={{ textAlign: 'left', padding: '12px', color: '#00D4FF', fontSize: 12 }}>
                                                Multiplier
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            [1, 0.5],
                                            [2, 1.05],
                                            [3, 1.2],
                                            [4, 1.35],
                                            [5, 1.5],
                                            [6, 2.0],
                                        ].map(([combo, mult]) => (
                                            <tr key={combo}>
                                                <td style={{ padding: '12px', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                                                    {combo}
                                                </td>
                                                <td style={{ padding: '12px', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                                                    {mult}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Box>
                            <Box color="rgba(255,255,255,0.75)" fontSize="15px" lineHeight="1.6">
                                You can get betAmount x multiplier on each smash.
                                <br />
                                In the middle of the game, you can get a big multiplier and break the all eggs by smashing.
                            </Box>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            <CocoBetHistory results={cocoHistory} />
            </Box>
        </Box>
    );
}