import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import {
    Flex,
    SimpleGrid,
    Grid,
    Box,
    Icon
} from "@chakra-ui/react";

import { FaPlay, FaUser } from "react-icons/fa";

import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";

import tierA from "assets/img/Games/tierA.jpg";
import tierB from "assets/img/Games/tierB.jpg";
import tierC from "assets/img/Games/tierC.jpg";
import rubic from "assets/img/Games/dice5.jpg";
import pumping from "assets/img/Games/pumping.jpg";
import gravity from "assets/img/Games/gravity.jpg";
import cloudSpread from "assets/img/Games/gravity.jpg";
import dove from "assets/img/Games/dove.jpg"
import coco from "assets/img/Games/coco.jpg"
import jackal from "assets/img/Games/jackal.jpg"
import rocket from "assets/img/Games/rocket.jpg"
import fishing from "assets/img/Games/fishing.jpg"
import mine from "assets/img/Games/mine.jpg"
import cardGame from "assets/img/Games/cardgame.jpg"
import jokerCrash from "assets/img/Games/jokercrash.jpg"
import alphaTree from "assets/img/Games/alphaTree.jpg"
import digits from "assets/img/Games/digits.jpg"
import cloud from "assets/img/Games/cloud.jpg"
import twist from "assets/img/Games/twist.jpg"
import climb from "assets/img/Games/climb.jpg"
import dice from "assets/img/Games/dice.jpg"
import coinImage from "assets/img/Games/coin.jpg"
import keno from "assets/img/Games/keno.jpg"
import doubleGame from "assets/img/Games/double.jpg"
import wheel from "assets/img/Games/wheel.jpg"
import plinko from "assets/img/Games/plinko.jpg"
import snakes from "assets/img/Games/snake.jpg"


const DEFAULT_DISPLAY_TICK_MS = 3000;
const DISPLAY_RANGE_ABOVE_BASE = 10;

const DASHBOARD_GAMES = [
    { img: tierA, name: "NumBanco Tier A", path: "/numbanco/tierA", reduxKey: "tierAUsers", tickMs: 4200 },
    { img: tierB, name: "NumBanco Tier B", path: "/numbanco/tierB", reduxKey: "tierBUsers", tickMs: 4800 },
    { img: tierC, name: "NumBanco Tier C", path: "/numbanco/tierC", reduxKey: "tierCUsers", tickMs: 5500 },
    { img: rubic, name: "Rubic", path: "/game/rubic", reduxKey: "rubicUsers", tickMs: 6000 },
    { img: pumping, name: "Pumping", path: "/game/pumping", reduxKey: "pumpingUsers", tickMs: 3800 },
    { img: fishing, name: "Fishing", path: "/game/fishing", reduxKey: "fishingUsers", tickMs: 4200 },
    { img: jokerCrash, name: "Joker Crash", path: "/game/joker-crash", reduxKey: "jokerCrashUsers", tickMs: 4200 },
    { img: cardGame, name: "Card Game", path: "/game/card-game", reduxKey: "cardGameUsers", tickMs: 4200 },
    { img: gravity, name: "Gravity", path: "/game/gravity", reduxKey: "gravityUsers", tickMs: 6500 },
    { img: doubleGame, name: "Double", path: "/game/double", reduxKey: "doubleUsers", tickMs: 5800 },
    { img: plinko, name: "Plinko", path: "/game/plinko", reduxKey: "plinkoUsers", tickMs: 5400 },
    { img: cloud, name: "Cloud Spread", path: "/game/cloud-spread", reduxKey: "cloudSpreadUsers", tickMs: 6200 },
    { img: dove, name: "LUCKY HOP", path: "/game/dove", reduxKey: "doveUsers", tickMs: 5200 },
    { img: dice, name: "Dice", path: "/game/dice", reduxKey: "diceUsers", tickMs: 5200 },
    // { img: dice, name: "Hash Dice", path: "/game/hash-dice", reduxKey: "diceUsers", tickMs: 5300 },
    { img: coco, name: "Coco", path: "/game/coco", reduxKey: "cocoUsers", tickMs: 4600 },
    { img: wheel, name: "Wheel", path: "/game/wheel", reduxKey: "wheelUsers", tickMs: 4600 },
    { img: snakes, name: "Snakes", path: "/game/snakes", reduxKey: "snakesUsers", tickMs: 3600 },
    { img: rocket, name: "Rocket Shot", path: "/game/rocket-shot", reduxKey: "rocketUsers", tickMs: 3600 },
    { img: jackal, name: "Jackal", path: "/game/jackal", reduxKey: "jackalUsers", tickMs: 2600 },
    { img: mine, name: "Mine", path: "/game/mine", reduxKey: "mineUsers", tickMs: 4900 },
    { img: twist, name: "Twist", path: "/game/twist", reduxKey: "twistUsers", tickMs: 5600 },
    { img: climb, name: "Climb", path: "/game/climb", reduxKey: "climbUsers", tickMs: 5200 },
    { img: alphaTree, name: "Alpha Tree", path: "/game/alpha-tree", reduxKey: "alphaTreeUsers", tickMs: 9900 },
    { img: digits, name: "Digits", path: "/game/digits", reduxKey: "aToZUsers", tickMs: 3600 },
    { img: coinImage, name: "Coin", path: "/game/coin", reduxKey: "coinUsers", tickMs: 3600 },
    { img: keno, name: "Keno", path: "/game/keno", reduxKey: "kenoUsers", tickMs: 3600 },
];

function stepOneGameDisplay(path, reduxKey, prev, au) {
    const base = Number(au[reduxKey]) || 0;
    const min = base;
    const max = base + DISPLAY_RANGE_ABOVE_BASE;
    let cur = prev[path] ?? base;
    cur = Math.min(max, Math.max(min, cur));
    let delta = Math.random() < 0.5 ? -1 : 1;
    if (cur <= min) delta = 1;
    else if (cur >= max) delta = -1;
    return { ...prev, [path]: cur + delta };
}

function Games() {
    const history = useHistory();
    const activeUsers = useSelector((state) => state.user.activeUsers);
    const activeUsersRef = useRef(activeUsers);
    activeUsersRef.current = activeUsers;
    const [displayCounts, setDisplayCounts] = useState(() => ({}));

    useEffect(() => {
        setDisplayCounts((prev) => {
            const next = { ...prev };
            for (const g of DASHBOARD_GAMES) {
                const base = Number(activeUsers[g.reduxKey]) || 0;
                const min = base;
                const max = base + DISPLAY_RANGE_ABOVE_BASE;
                const cur = prev[g.path] ?? base;
                next[g.path] = Math.min(max, Math.max(min, cur));
            }
            return next;
        });
    }, [activeUsers]);

    useEffect(() => {
        const ids = DASHBOARD_GAMES.map((g) => {
            const ms = g.tickMs ?? DEFAULT_DISPLAY_TICK_MS;
            return setInterval(() => {
                const au = activeUsersRef.current;
                setDisplayCounts((prev) => stepOneGameDisplay(g.path, g.reduxKey, prev, au));
            }, ms);
        });
        return () => ids.forEach(clearInterval);
    }, []);

    const games = useMemo(
        () =>
            DASHBOARD_GAMES.map((g) => ({
                ...g,
                displayUsers:
                    displayCounts[g.path] ?? (Number(activeUsers[g.reduxKey]) || 0),
            })),
        [activeUsers, displayCounts]
    );

    return (
        <Grid>
            <SimpleGrid
                columns={{ sm: 2, md: 3, lg: 3, xl: 3, "1625px": 6, "2xl": 6 }}
                spacing="24px"
                mb="20px"
            >
                {games.map((game, index) => (
                    <Card
                        key={index}
                        overflow="hidden"
                        transition="all 0.3s ease"
                        _hover={{ transform: "translateY(-6px)" }}
                        onClick={() => history.push(game.path)}
                        p="0px"
                    >

                        <CardBody p="5px">

                            <Box position="relative" role="group" cursor="pointer" w="100%" minHeight="300px">

                                {/* Game Image */}
                                <Box
                                    as="img"
                                    src={game.img}
                                    alt={game.name}
                                    w="100%"
                                    h="100%"
                                    borderRadius="14px"
                                    display="block"
                                    transition="transform 0.4s ease"
                                    _groupHover={{ transform: "scale(1.08)" }}
                                />

                                {/* Hover Overlay */}
                                <Flex
                                    position="absolute"
                                    top="0"
                                    left="0"
                                    w="100%"
                                    h="100%"
                                    borderRadius="14px"
                                    bg="rgba(0,0,0,0.45)"
                                    opacity="0"
                                    transition="0.3s"
                                    _groupHover={{ opacity: 1 }}
                                >

                                    {/* Play Circle - Always Center */}
                                    <Flex
                                        position="absolute"
                                        top="50%"
                                        left="50%"
                                        transform="translate(-50%, -50%) scale(0.8)"
                                        w="60px"
                                        h="60px"
                                        bg="rgba(255,255,255,0.3)"
                                        borderRadius="50%"
                                        align="center"
                                        justify="center"
                                        transition="0.3s"
                                        _groupHover={{ transform: "translate(-50%, -50%) scale(1)" }}
                                    >
                                        <Icon as={FaPlay} boxSize="30px" color="white" />
                                    </Flex>

                                    {/* Game Name */}
                                    <Box
                                        position="absolute"
                                        top="20%"
                                        left="50%"
                                        transform="translateX(-50%)"
                                        color="white"
                                        fontWeight="bold"
                                        fontSize="lg"
                                        textAlign="center"
                                        opacity="0"
                                        transition="0.3s"
                                        _groupHover={{ opacity: 1 }}
                                    >
                                        {game.name}
                                    </Box>

                                </Flex>

                                <Flex
                                    position="absolute"
                                    bottom="10px"
                                    right="10px"
                                    align="center"
                                    bg="rgba(0,0,0,0.6)"
                                    borderRadius="20px"
                                    px="8px"
                                    py="4px"
                                >
                                    <Icon as={FaUser} color="white" w={5} h={5} mr="6px" />
                                    <Box color="white" fontSize="sm" fontWeight="bold">
                                        {game.displayUsers || 0}
                                    </Box>
                                </Flex>
                            </Box>

                        </CardBody>

                    </Card>
                ))}
            </SimpleGrid>
        </Grid>
    );
}

export default Games;