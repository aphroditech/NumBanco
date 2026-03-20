import {
    Box,
    Flex,
    Grid,
    GridItem,
    IconButton,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import sky from 'assets/img/Games/sky.png';
import egg from 'assets/img/Games/egg.png';
import chicken from 'assets/img/Games/chicken.png';
import chickenHit from 'assets/img/Games/chicken_hit.png';
import chickenStand from 'assets/img/Games/chicken_stand.png';
import eggBreak from 'assets/img/Games/broken_egg.png';
import eggCrack from 'assets/img/Games/cracked_egg.png';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { cocoSmash, cocoRestart } from 'action/CocoActions';
import { onlineUser, offlineUser } from 'action/BetActions';
import CocoRealView from './CocoItem/CocoRealView';
import PaidIcon from "@mui/icons-material/Paid";

export default function CocoPage() {
    const [chickenBottom, setChickenBottom] = useState(260);
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
    const [eggs, setEggs] = useState(
        Array(7).fill("normal")
    );
    const [towerOffset, setTowerOffset] = useState(0);
    const [shakeX, setShakeX] = useState(0);
    useEffect(() => {
        onlineUser(8);
        return () => {
            offlineUser(8);
        };
    }, []);
    const dispatch = useDispatch();
    const history = useHistory();
    const [latestWin, setLatestWin] = useState('0.00');
    const [latestMulti, setLatestMulti] = useState('0.00');
    const [latestCombo, setLatestCombo] = useState('0');
    const [loading, setLoading] = useState(false);
    const user = useSelector((state) => state.user.userInfo) || {};
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
            setChickenBottom(320);
            
            // call API at same time (important)
            const smashPromise = cocoSmash(
                { betAmount },
                dispatch,
                history
            );
    
            // go to hit quickly
            setTimeout(() => {
                setAnimState("hit");
                setChickenBottom(260);
            }, 120);
    
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

                        setAnimState("finalDown");
                    
                        let step = 0;
                    
                        const breakInterval = setInterval(() => {
                    
                            step++;
                    
                            // move chicken down
                            setChickenBottom(prev => prev - 40);
                    
                            // break top egg
                            setEggs(prev => {
                    
                                const copy = [...prev];
                    
                                if (copy.length > 0) {
                                    copy[0] = "break";
                                }
                    
                                return copy;
                    
                            });
                    
                            // remove egg after break
                            setTimeout(() => {
                    
                                setEggs(prev => {
                    
                                    const copy = [...prev];
                    
                                    if (copy.length > 0) {
                                        copy.shift();
                                    }
                    
                                    return copy;
                    
                                });
                    
                            }, 80);
                    
                            // stop after all eggs
                            if (step >= 7) {
                    
                                clearInterval(breakInterval);
                    
                                setTimeout(() => {
                    
                                    setAnimState("finalStand");
                                    setChickenBottom(20);

                                    setTimeout(() => {

                                        if (!restartCalledRef.current) {
                                
                                            restartCalledRef.current = true;
                                
                                            handleRestart();
                                
                                        }
                                
                                    }, 1000);
                    
                                }, 150);
                    
                                setTimeout(() => {
                    
                                    setAnimState("showMulti");
                    
                                }, 400);
                    
                            }
                    
                        }, 120);
                    
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
                
                        setTimeout(() => {
                
                            setEggs((prev) => {
                                const copy = [...prev];
                                copy.shift();
                                copy.push("normal");
                                return copy;
                            });
                
                            setAnimState("idle");
                
                        }, 220);
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
            setEggs(Array(7).fill("normal"));
            setTowerOffset(0);
            setShakeX(0);

            await cocoRestart(dispatch, history);
            setLatestWin('0.00');
            setLatestMulti('0.00');
            setLatestCombo('0');
            setChickenBottom(260);
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
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            {/* Restart fog cover */}
            <Box
                position="fixed"
                top={0}
                left={0}
                w="100vw"
                h="100vh"
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
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.65))',
                    }}
                />
                <div
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
            <Flex
                flexWrap="wrap"
                gap="20px"
                justifyContent="center"
                alignItems="stretch"
                w="100%"
            >
                <Box
                    flex="1 1 450px"
                    minH="450px"
                    minW={{ base: '100%', md: '500px' }}
                    maxW="500px"
                    display="flex"
                >
                    <Card w="100%" h="100%">
                        <CardBody p={0}>
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: 450,
                                        minWidth: 450,
                                    }}
                                >
                                    {/* SKY IMAGE */}
                                    <img
                                        src={sky}
                                        alt="sky"
                                        style={{ width: '100%', display: 'block' }}
                                    />

                                    {/* TOP BAR inside sky */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '2%',
                                            left: '2%',
                                            right: '2%',
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
                                            />
                                        </div>
                                    </div>
                                                
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '2%',
                                            left: '50%',
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
                                            transform: `translate(-50%, ${towerOffset}px)`,
                                            transition: "transform 0.3s ease",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
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
                                                    key={i}
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
                                            width: 200,
                                            transition: "all 0.2s linear",

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

                                        <button
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
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Box>

                <Box
                    flex="0 0 450px"
                    minW={{ base: '100%', md: '500px' }}
                    maxW="500px"
                    minH="500px"
                    display="flex"
                >
                    <CocoRealView />
                </Box>
            </Flex>
        </Box>
    );
}