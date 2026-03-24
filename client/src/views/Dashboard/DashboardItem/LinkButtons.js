import React, { useState, useEffect } from "react";
import {
    SimpleGrid,
    Box,
    Text,
    Image,
    useDisclosure,
    keyframes
} from "@chakra-ui/react";
import Reward from "views/Lottery/Reward";
import tierA from "assets/badge/tier/tierA.png";
import tierB from "assets/badge/tier/tierB.png";
import tierC from "assets/badge/tier/tierC.png";
import dailyloot from "assets/badge/tier/opendaily.png";
import partnership from "assets/badge/tier/partnership.png";
import rewardIcon from "assets/badge/tier/reward.png";
import profileIcon from "assets/badge/tier/profile.png";
import faqIcon from "assets/badge/tier/faq.png";
import contactusIcon  from "assets/badge/tier/contactus.png";
import { useSelector } from "react-redux";

// Preload dashboard icons ASAP to avoid "shows after seconds"
// (background-image would still load; preloading is the real fix)
const __DASHBOARD_ICONS__ = [tierA, tierB, tierC, dailyloot, partnership, rewardIcon, profileIcon, faqIcon, contactusIcon];
__DASHBOARD_ICONS__.forEach((src) => {
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
});

import Card from "components/Card/Card.js";
import { NavLink } from "react-router-dom";
import { useDispatch } from "react-redux";

import DailyDialog from "components/Dialog/DailyDialog";
import DailyLoot from "views/Lottery/DailyLoot";

import { totalActiveUsers as fetchTotalActiveUsers } from "action/BetActions";

/* =======================
   SPARKLING NEON POINT EFFECT
======================= */
const neonPointGlow = keyframes`
    0% {
        box-shadow: 
        0 0 5px rgba(0, 255, 255, 0.8),
        0 0 10px rgba(0, 255, 255, 0.6),
        0 0 15px rgba(0, 255, 255, 0.4),
        0 0 20px rgba(0, 255, 255, 0.2);
    }
    25% {
        box-shadow: 
        0 0 8px rgba(157, 0, 255, 0.8),
        0 0 16px rgba(157, 0, 255, 0.6),
        0 0 24px rgba(157, 0, 255, 0.4),
        0 0 32px rgba(157, 0, 255, 0.2);
    }
    50% {
        box-shadow: 
        0 0 10px rgba(0, 255, 157, 0.8),
        0 0 20px rgba(0, 255, 157, 0.6),
        0 0 30px rgba(0, 255, 157, 0.4),
        0 0 40px rgba(0, 255, 157, 0.2);
    }
    75% {
        box-shadow: 
        0 0 8px rgba(255, 0, 255, 0.8),
        0 0 16px rgba(255, 0, 255, 0.6),
        0 0 24px rgba(255, 0, 255, 0.4),
        0 0 32px rgba(255, 0, 255, 0.2);
    }
    100% {
        box-shadow: 
        0 0 5px rgba(0, 255, 255, 0.8),
        0 0 10px rgba(0, 255, 255, 0.6),
        0 0 15px rgba(0, 255, 255, 0.4),
        0 0 20px rgba(0, 255, 255, 0.2);
    }
`;

const sparklePulse = keyframes`
    0% {
        opacity: 0.6;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.2);
    }
    100% {
        opacity: 0.6;
        transform: scale(1);
    }
`;

const rainbowText = keyframes`
    0% { color: #00d4ff; } /* Cyan */
    50% { color: #ffffff; } /* White */
    100% { color: #00d4ff; } /* Cyan */
`;

// BC Game style card component
const GameCard = ({ 
        to, 
        onClick, 
        icon, 
        title, 
        bgGradient,
        glowColor,
        gridPattern = false,
        activeUser = null,
        partnerLevel = null,
        remainingTime = null,
        tierAText = null,
        typingSpeed = 50,
    }) => {
    const CardContent = (
        <Box
        className="game-card"
        w="100%"
        h="130px"
        // h={{ base: "150px", sm: "16px", md: "100px", lg: "20px" }}
        borderRadius="16px"
        p={{ base: "14px", sm: "16px", md: "18px", lg: "20px" }}
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        position="relative"
        cursor="pointer"
        transition="transform 0.3s ease, box-shadow 0.3s ease"
        overflow="hidden"
        willChange="transform"
        // backfaceVisibility="hidden"
        transform="translateZ(0)"
        sx={{
            aspectRatio: "2 / 1",
            background: bgGradient,
            // WebkitBackfaceVisibility: "hidden",
            WebkitTransform: "translateZ(0)",
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
            ...(gridPattern && {
            backgroundImage: `
                linear-gradient(${glowColor}08 1px, transparent 1px),
                linear-gradient(90deg, ${glowColor}08 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
            }),
            "&:hover": {
            transform: "translateY(-4px) translateZ(0)",
            boxShadow: `0 8px 24px ${glowColor}40, 0 0 40px ${glowColor}20`,
            borderRadius: "16px",
            },
            "&:hover .card-avatar": {
            filter: `drop-shadow(0 0 30px ${glowColor}) drop-shadow(0 0 60px ${glowColor}60)`,
            transform: "scale(1.05)",
            },
        }}
        >
            {/* Title and active user */}
            <Box mb="auto">
                {/* Title */}
                <Text
                    fontSize={{ base: "12px", sm: "14px", md: "15px", lg: "16px" }}
                    fontWeight="900"
                    color="white"
                    textTransform="uppercase"
                    letterSpacing={{ base: "1px", md: "1.5px", lg: "2px" }}
                    textAlign="left"
                    textShadow={`0 0 10px ${glowColor}, 0 0 20px ${glowColor}60, 0 2px 4px rgba(0,0,0,0.8)`}
                    whiteSpace="nowrap"
                    overflow="visible"
                    position="relative"
                    zIndex="3"
                    w="100%"
                    lineHeight="1.2"
                    isTruncated={false}
                >
                    {title}
                </Text>

                {/* Active User (under the title) */}
                {activeUser!== null && (
                <Box position="absolute" display="flex" alignItems="center" mt="4px">
                    {/* Sparkling Neon Point */}
                    <Box
                        w="6px"
                        h="6px"
                        borderRadius="50%"
                        bg={glowColor}
                        mr="8px"
                        sx={{
                            animation: `${neonPointGlow} 3s ease-in-out infinite, ${sparklePulse} 2s ease-in-out infinite`,
                            boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}60`,
                        }}
                    />
                    <Text color="white" fontSize="12px">
                        Active User: {activeUser}
                    </Text>
                </Box>
                )}
                {/* Tier A typing text under Active User */}
                {tierAText && (
                <Box position="absolute" display="flex" alignItems="center" mt="20px">
                    <Text 
                        fontSize="16px" 
                        fontWeight="bold"
                        sx={{
                            background: "transparent",
                            backgroundColor: "transparent",
                            bg: "transparent",
                            animation: `${rainbowText} 2s ease-in-out infinite`,
                        }}
                    >
                        {tierAText}
                    </Text>
                </Box>
                )}
                {/* Partner earn percentage */}
                {partnerLevel && (
                <Box position="absolute" display="flex" alignItems="center" mt="4px">
                    {/* Sparkling Neon Point */}
                    <Text color="white" fontSize="12px">
                    {partnerLevel}%
                    </Text>
                </Box>
                )}
                {/* remaining reward time */}
                {remainingTime !==null && (
                <Box position="absolute" display="flex" alignItems="center" mt="4px">
                    {/* Sparkling Neon Point */}
                    <Text color="white" fontSize="12px">
                        {remainingTime}
                    </Text>
                </Box>
                )}
            </Box>

            {/* Avatar right side */}
            <Box
                display="flex"
                justifyContent="flex-end"
                alignItems="flex-end"
                position="relative"
                zIndex="2"
                mt="auto" 
                top={3} 
            >
                <Image
                    className="card-avatar"
                    src={icon}
                    alt={`NumBanco ${title}`}
                    loading="eager"
                    w={{ base: "40px", sm: "60px", md: "70px", lg: "80px" }}
                    h={{ base: "40px", sm: "90px", md: "70px", lg: "80px" }}
                    bg="transparent"
                    borderRadius="0"
                    objectFit="contain"
                    sx={{
                        filter: `drop-shadow(0 0 20px ${glowColor}80) drop-shadow(0 0 40px ${glowColor}40)`,
                        transition: "all 0.3s ease",
                    }}
                />
            </Box>
        </Box>
    );

    if (to) {
        return (
        <NavLink to={to} style={{ textDecoration: "none" }}>
            {CardContent}
        </NavLink>
        );
    }

    return (
        <Box onClick={onClick}>
            {CardContent}
        </Box>
    );
};

function LinkButtons() {
    const [isDailyOpen, setDailyOpen] = useState(false);
    const [isRewardOpen, setRewardOpen] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const isMountedRef = React.useRef(true);
    const dispatch = useDispatch();

    const [remainingTime, setRemainingTime] = useState(0);  
    const [isLoading, setIsLoading] = useState(true);
    const countdownRef = React.useRef(null);
    
    // Separate typing states for each tier
    const [tierAText, setTierAText] = useState("");
    const [tierATextIndex, setTierATextIndex] = useState(0);
    const [tierBText, setTierBText] = useState("");
    const [tierBTextIndex, setTierBTextIndex] = useState(0);
    const [tierCText, setTierCText] = useState("");
    const [tierCTextIndex, setTierCTextIndex] = useState(0);

    const user = useSelector((state) => state.user.userInfo)    
    const activeUsers = useSelector((state) => state.user.activeUsers)

    const remainingMs = useSelector(s => s.user.lootRemainingMs);
    const lootAvailable = useSelector(s => s.user.lootAvailable);
    

    useEffect(() => {
        return () => {
            isMountedRef.current = false;

            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
        };
    }, []);


    // Typing effect for Tier A (fastest)
    useEffect(() => {
        if (user?.membership >= 0) {
            const texts = ["BET NOW", "BIG WIN"];
            const currentText = texts[tierATextIndex];
            
            if (tierAText.length < currentText.length) {
                const timeout = setTimeout(() => {
                    setTierAText(currentText.slice(0, tierAText.length + 1));
                }, 30); // Fast: 30ms per character
                return () => clearTimeout(timeout);
            } else {
                const timeout = setTimeout(() => {
                    setTierAText("");
                    setTierATextIndex((prev) => (prev + 1) % texts.length);
                }, 1000); // Fast: 1s pause
                return () => clearTimeout(timeout);
            }
        }
    }, [tierAText, tierATextIndex, user?.membership]);

    // Typing effect for Tier B (medium)
    useEffect(() => {
        if (user?.membership >= 1) {
            const texts = ["BET NOW", "BIG WIN"];
            const currentText = texts[tierBTextIndex];
            
            if (tierBText.length < currentText.length) {
                const timeout = setTimeout(() => {
                    setTierBText(currentText.slice(0, tierBText.length + 1));
                }, 60); // Medium: 60ms per character
                return () => clearTimeout(timeout);
            } else {
                const timeout = setTimeout(() => {
                    setTierBText("");
                    setTierBTextIndex((prev) => (prev + 1) % texts.length);
                }, 1500); // Medium: 1.5s pause
                return () => clearTimeout(timeout);
            }
        }
    }, [tierBText, tierBTextIndex, user?.membership]);

    // Typing effect for Tier C (slowest)
    useEffect(() => {
        if (user?.membership >= 2) {
            const texts = ["BET NOW", "BIG WIN"];
            const currentText = texts[tierCTextIndex];
            
            if (tierCText.length < currentText.length) {
                const timeout = setTimeout(() => {
                    setTierCText(currentText.slice(0, tierCText.length + 1));
                }, 100); // Slow: 100ms per character
                return () => clearTimeout(timeout);
            } else {
                const timeout = setTimeout(() => {
                    setTierCText("");
                    setTierCTextIndex((prev) => (prev + 1) % texts.length);
                }, 2000); // Slow: 2s pause
                return () => clearTimeout(timeout);
            }
        }
    }, [tierCText, tierCTextIndex, user?.membership]);

    const format = (ms) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
    };
    
    
    return (
        <Card position="relative" w="100%" h="100%" display="flex" flexDirection="column"
            // height={{ sm:"250px", md:"984px",lg: "1008px", '1115px': '530px' }}
        >
            <SimpleGrid
                w="100%"
                flex="1"
                columns={{ base: 1, md: 2, '2xl': 2 }}
                gap={{ base: "14px", sm: "16px", md: "18px", lg: "20px" }}
                mt="20px"
                mb="20px"
                px={{ base: "10px", sm: "12px", md: "16px", lg: "18px" }}
                justifyItems="stretch"
            >
                {/* Tier A */}
                {/* <GameCard
                    w="100%"
                    to="/numbanco/tierA"
                    icon={tierA}
                    title="Tier A"
                    bgGradient="linear-gradient(135deg, #0a1f14 0%, #1a4d3a 50%, #0a1f14 100%)"
                    glowColor="#4ade80"
                    activeUser={activeUsers?.tierAUsers == 0 ? totalActiveUsers.tierAUsers : activeUsers?.tierAUsers}
                    gridPattern={true}
                    tierAText={user?.membership >= 0 ? tierAText : null}
                /> */}

                {/* Tier B */}
                {/* <GameCard
                    to="/numbanco/tierB"
                    icon={tierB}
                    title="Tier B"
                    bgGradient="linear-gradient(135deg, #0a1f14 0%, #1a4d3a 50%, #0a1f14 100%)"
                    glowColor="#4ade80"
                    activeUser={activeUsers?.tierBUsers == 0 ? totalActiveUsers.tierBUsers : activeUsers?.tierBUsers}
                    gridPattern={true}
                    tierAText={user?.membership >= 1 ? tierBText : null}
                /> */}

                {/* Tier C */}
                {/* <GameCard
                    to="/numbanco/tierC"
                    icon={tierC}
                    title="Tier C"
                    bgGradient="linear-gradient(135deg, #0a1f14 0%, #1a4d3a 50%, #0a1f14 100%)"
                    glowColor="#4ade80"
                    activeUser={activeUsers?.tierCUsers == 0 ? totalActiveUsers.tierCUsers : activeUsers?.tierCUsers}
                    gridPattern={true}
                    tierAText={user?.membership >= 2 ? tierCText : null}
                /> */}

                {/* Daily Loot */}
                <GameCard
                    onClick={() => setDailyOpen(true)}
                    icon={dailyloot}
                    title="Daily Loot"
                    bgGradient="linear-gradient(135deg, #2b1a05 0%, #5a3a0a 50%, #2b1a05 100%)"
                    glowColor="#ffb347"
                    gridPattern={true}
                    remainingTime={ lootAvailable ? "Can get now!" : format(remainingMs)}
                />

                {/* Affiliation */}
                <GameCard
                    to="/user/affiliation"
                    icon={partnership}
                    title="Affiliation"
                    bgGradient="linear-gradient(135deg, #2a0f1f 0%, #5a1f45 50%, #2a0f1f 100%)"
                    glowColor="#ff7aa8"
                    gridPattern={true}
                    partnerLevel={user?.partnerLevel}
                />
                {/* Reward */}
                <GameCard
                    onClick={() => setRewardOpen(true)}
                    icon={rewardIcon}
                    title="Reward"
                    bgGradient="linear-gradient(135deg, #2b2005 0%, #6a4b0f 50%, #2b2005 100%)"
                    glowColor="#ffd700"
                    gridPattern={true}
                />

                {/* My Profile */}
                <GameCard
                    to="/user/myprofile"
                    icon={profileIcon}
                    title="My Profile"
                    bgGradient="linear-gradient(135deg, #2b1405 0%, #5a2a0f 50%, #2b1405 100%)"
                    glowColor="#ff9a3c"
                    gridPattern={true}
                />

                
                {/* FAQ */}
                <GameCard
                    to="/help/faq"
                    icon={faqIcon}
                    title="FAQ"
                    bgGradient="linear-gradient(135deg, #0d1c2b 0%, #1e3f6a 50%, #0d1c2b 100%)"
                    glowColor="#4da6ff"
                    gridPattern={true}
                />

                {/* Contact Us */}
                <GameCard
                    to="/help/contactus"
                    icon={contactusIcon}
                    title="Contact Us"
                    bgGradient="linear-gradient(135deg, #0d2b16 0%, #1f6a3a 50%, #0d2b16 100%)"
                    glowColor="#25d366"
                    gridPattern={true}
                />
            </SimpleGrid>

            {/* Daily Loot Dialog */}
            <DailyDialog
                isOpen={isDailyOpen}
                onClose={() => setDailyOpen(false)}
                content={<DailyLoot />}
                top="calc(50% - 300px)"
                bgColor="transparent"
            />
            {/* Reward Dialog */}
            <DailyDialog
                content={<Reward />}
                bgColor="#2a2d2e"
                isOpen={isRewardOpen}
                onClose={() => setRewardOpen(false)} 
            />
        </Card>
    );
}

export default LinkButtons;