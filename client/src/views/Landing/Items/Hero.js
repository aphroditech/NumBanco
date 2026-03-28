// Hero.js
import React, { useState, useEffect } from "react";
import {
    Flex,
    Text,
    Button,
    Stack,
    Container,
    Heading,
    Box,
    Image,
    IconButton,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink as RouterLink } from "react-router-dom";
import LandingAD1 from "assets/img/LandingAD/1.jpg";
import LandingAD2 from "assets/img/LandingAD/2.jpg";
import LandingAD3 from "assets/img/LandingAD/3.jpg";
import LandingAD4 from "assets/img/LandingAD/4.jpg";
import LandingAD5 from "assets/img/LandingAD/5.jpg";

const SEGMENT_DURATION_MS = 7000;
const SLIDE_DURATION_S = 0.6;

const segments = [
    {
        image: LandingAD4,
        label: "Where Numbers Beat Luck",
        heading: "Bet With Clarity.\nWin With Confidence.",
        subtext: "Enjoy the best betting anytime, anywhere.",
    },
    {
        image: LandingAD1,
        label: "Very Fast & Fair",
        heading: "30-Second Draws.\nProvably Fair.",
        subtext: "Short rounds and transparent results.",
    },
    {
        image: LandingAD3,
        label: "Play Smarter",
        heading: "Choose Your Numbers.\nOwn Your Luck.",
        subtext: "Pick your tickets and play your way.",
    },
    {
        image: LandingAD2,
        label: "numbanco.io",
        heading: "Real-Time Results.\nInstant Excitement.",
        subtext: "See outcomes live as they happen.",
    },
    {
        image: LandingAD5,
        label: "Smart Withdrawal",
        heading: "Enjoy quick! \nFast withdrawals anytime.",
        subtext: "No waiting, no hassle — withdraw your winnings in seconds."
    }
];

const textVariants = {
    enter: { x: "-100vw", opacity: 0.6 },
    center: { x: 0, opacity: 1 },
    exit: { x: "-100vw", opacity: 0.6 },
};

const imageVariants = {
    enter: { x: "100vw", opacity: 0.6 },
    center: { x: 0, opacity: 1 },
    exit: { x: "100vw", opacity: 0.6 },
};

const transition = { duration: SLIDE_DURATION_S, ease: "easeInOut" };

export default function Hero() {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((i) => (i + 1) % segments.length);
        }, SEGMENT_DURATION_MS);
        return () => clearInterval(interval);
    }, []);

    const prev = () =>
        setActiveIndex((i) => (i - 1 + segments.length) % segments.length);
    const next = () =>
        setActiveIndex((i) => (i + 1) % segments.length);

    const segment = segments[activeIndex];

    return (
        <Container
            as="section"
            aria-label="Hero section"
            maxW="100vw"
            pt={{ base: 30, md: 36 }}
            pb={{ base: 24, md: 30 }}
            position="relative"
            px={{ base: 6, md: 14, lg: 18 }}
            overflow="hidden"
        >
            <Flex
                position="relative"
                direction={{ base: "column", md: "row" }}
                align={{ base: "center", md: "center" }}
                justify="center"
                wrap="wrap"
                gap={{ base: 10, md: 10 }}
                minH={{ base: "640px", md: "580px" }}
                zIndex={1}
            >
                {/* Text block — same height as image so bottoms align */}
                <Box
                    as="article"
                    flex="1"
                    minW={{ base: "100%", md: "280px" }}
                    maxW="xl"
                    zIndex={10}
                    position="relative"
                    minH={{ base: "auto", md: "360px", lg: "420px" }}
                    h={{ base: "auto", md: "360px", lg: "420px" }}
                    ml={{ base: 0, md: 6, lg: 10 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`text-${activeIndex}`}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            variants={textVariants}
                            transition={transition}
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <Stack spacing={6} align={{ base: "center", md: "flex-start" }} textAlign={{ base: "center", md: "left" }} flex="1" justify="center">
                                <Text as="p" letterSpacing="widest" fontSize="sm" opacity={0.9} color="whiteAlpha.900">
                                    {segment.label}
                                </Text>
                                <Heading
                                    as="h1"
                                    fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
                                    lineHeight={1.1}
                                    color="white"
                                    whiteSpace="pre-line"
                                >
                                    {segment.heading}
                                </Heading>
                                <Text as="p" opacity={0.9} color="whiteAlpha.800">{segment.subtext}</Text>
                                <Flex gap={4} flexWrap="wrap" justify={{ base: "center", md: "flex-start" }} mt="auto">
                                    <Button
                                        bg="#00d4ff"
                                        color="black"
                                        px={10}
                                        borderRadius="full"
                                        _hover={{ bg: "#f7d260", transform: "translateY(-2px)" }}
                                        as={RouterLink}
                                        to="/auth/signup"
                                    >
                                        Bet Now
                                    </Button>
                                    <Button
                                        variant="outline"
                                        borderColor="white"
                                        color="white"
                                        px={10}
                                        borderRadius="full"
                                        _hover={{ bg: "whiteAlpha.200" }}
                                        onClick={() =>
                                            document.getElementById("FAQs")?.scrollIntoView({ behavior: "smooth" })
                                        }
                                    >
                                        FAQs
                                    </Button>
                                </Flex>
                            </Stack>
                        </motion.div>
                    </AnimatePresence>
                </Box>

                {/* Image block — slides in from right, out to right */}
                <Box
                    flex="0 0 auto"
                    position="relative"
                    zIndex={1}
                    w={["260px", "340px", "420px", "580px"]}
                    h={["260px", "340px", "420px", "580px"]}
                    mr={{ base: 0, md: 6, lg: 10 }}
                    ml={{ base: 0, md: -2, lg: -4 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`image-${activeIndex}`}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            variants={imageVariants}
                            transition={transition}
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Box
                                w="100%"
                                h="100%"
                                backgroundImage={`url(${segment.image})`}
                                backgroundSize="cover"          // same as objectFit="cover"
                                backgroundPosition="center"
                                backgroundRepeat="no-repeat"
                                borderRadius="12px"
                                boxShadow="0 12px 28px rgba(0,0,0,0.2)"
                            />
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Flex>

            {/* Side arrows */}
            <IconButton
                aria-label="Previous"
                icon={<ChevronLeftIcon boxSize={7} />}
                onClick={prev}
                position="absolute"
                left={{ base: "18px", md: "28px" }}
                top="50%"
                transform="translateY(-50%)"
                bg="rgba(0,0,0,0.18)"
                color="white"
                border="1px solid rgba(255,255,255,0.35)"
                _hover={{ bg: "rgba(0,0,0,0.28)" }}
                rounded="full"
                zIndex={2}
            />
            <IconButton
                aria-label="Next"
                icon={<ChevronRightIcon boxSize={7} />}
                onClick={next}
                position="absolute"
                right={{ base: "18px", md: "28px" }}
                top="50%"
                transform="translateY(-50%)"
                bg="rgba(0,0,0,0.18)"
                color="white"
                border="1px solid rgba(255,255,255,0.35)"
                _hover={{ bg: "rgba(0,0,0,0.28)" }}
                rounded="full"
                zIndex={2}
            />
        </Container>
    );
}
