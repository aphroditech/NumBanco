import React, { useState, useEffect } from "react";
import {
    Box,
    Flex,
    Text,
    Stack,
    Container,
    Heading,
    Image,
    IconButton,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { concepts } from "variables/Concepts";

const MotionBox = motion(Box);

export default function Concept() {
    const dispatch = useDispatch();
    const index = useSelector((state) => state.slideIndex?.index);
    const [direction, setDirection] = useState(1);

    function setIndex(newIndex) {
        dispatch({ type: "SET_SLIDE_INDEX", payload: newIndex });
    }

    useEffect(() => {
        const interval = setInterval(() => {
            setDirection(1);
            const tempIndex = (index + 1) % concepts.length;
            setIndex(tempIndex);
        }, 10000);
        return () => clearInterval(interval);
    }, [concepts.length, index]);

    const handleNext = () => {
        setDirection(1);
        const tempIndex = (index + 1) % concepts.length;
        setIndex(tempIndex);
    };

    const handlePrev = () => {
        setDirection(-1);
        const tempIndex = index === 0 ? concepts.length - 1 : index - 1;
        setIndex(tempIndex);
    };

    const active = concepts[index];

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 80 : -80,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.45, ease: "easeOut" },
        },
        exit: (direction) => ({
            x: direction > 0 ? -80 : 80,
            opacity: 0,
            transition: { duration: 0.35, ease: "easeIn" },
        }),
    };

    const topCurveH = 140;

    return (
        <Box
            bg="#000000"
            color="white"
            position="relative"
            overflow="hidden"
            pt={{ base: topCurveH + 32, md: topCurveH + 44 }}
            // pb={{ base: -12, md: -20 }}
            _before={{
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: `${topCurveH}px`,
                // White curve "cut-in" over black background
                background: "#ffffff",
                // Invert curve direction: curve sits on TOP edge
                clipPath: "ellipse(60% 75% at 50% 0%)",
                pointerEvents: "none",
                zIndex: 0,
            }}
            id="bet-concept"
        >
            <Container  as="section" aria-labelledby="concept-heading" maxW="7xl" position="relative" zIndex={1}>
                <Heading as="h2" id="concept-heading" letterSpacing="widest" mb={4} color="#fff">
                    BETTING CONCEPT
                </Heading>

                <Flex
                    direction={{ base: "column-reverse", md: "row" }}
                    align="center"
                    gap={{ base: 8, md: 12 }}
                >
                    {/* TEXT SECTION */}
                    <Box flex="1" position="relative">
                        <Box
                            position={{ base: "static", md: "relative" }}
                            minH={{ base: "auto", md: "220px" }}
                            overflow={{ base: "visible", md: "hidden" }}
                        >
                            <AnimatePresence custom={direction} mode="wait">
                                <MotionBox
                                    key={index}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    position={{ base: "relative", md: "absolute" }}
                                    top={0}
                                    left={0}
                                    w="100%"
                                >
                                    <Stack
                                        spacing={6}
                                        maxW="xl"
                                        w="100%"
                                        textAlign={{ base: "center", md: "left" }}
                                    >
                                        <Heading as="h3" fontSize="4xl" color="#00d4ff" lineHeight={1.2}>
                                            {active.title}
                                        </Heading>

                                        <Text as="p" fontSize="md" opacity={0.9} lineHeight={1.9} color="whiteAlpha.800">
                                            {active.desc}
                                        </Text>
                                    </Stack>
                                </MotionBox>
                            </AnimatePresence>
                        </Box>
                    </Box>

                    {/* IMAGE SECTION */}
                    <Box
                        flex="1"
                        w="100%"
                        maxW={{ base: "100%", md: "490px" }}
                        bg="#071019"
                        borderRadius="2xl"
                        p={1}
                        border="1px solid rgba(255, 255, 255, 0.18)"
                        boxShadow="
                            0 0 18px rgba(255, 255, 255, 0.18),
                            0 0 48px rgba(255, 255, 255, 0.12),
                            0 28px 50px rgba(0, 0, 0, 0.8)
                        "
                    >
                        <Box
                            position="relative"
                            h={{ base: "240px", sm: "280px", md: "320px" }}
                            overflow="hidden"
                            borderRadius="2xl"
                        >
                            <AnimatePresence custom={direction} mode="wait">
                                <MotionBox
                                    key={active.image}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate={{ ...slideVariants.center }}
                                    exit="exit"
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    w="100%"
                                    h="100%"
                                >
                                    <Box
                                        w="100%"
                                        h="100%"
                                        backgroundImage={`url(${active.image})`}
                                        backgroundSize="contain"          // same as objectFit="contain"
                                        backgroundPosition="center"
                                        backgroundRepeat="no-repeat"
                                        borderRadius="2xl"
                                        role="img"
                                        aria-label={`NumBanco ${active.title} illustration`}
                                        draggable={true}
                                    />
                                </MotionBox>
                            </AnimatePresence>
                        </Box>
                    </Box>
                </Flex>

                {/* CONTROLS */}
                <Flex justify="center" gap={6} pt={6}>
                    <IconButton
                        aria-label="Previous"
                        icon={<ChevronLeftIcon boxSize={6} />}
                        onClick={handlePrev}
                        bg="rgba(0,0,0,0.18)"
                        color="white"
                        border="1px solid rgba(255,255,255,0.35)"
                        _hover={{ bg: "rgba(0,0,0,0.28)" }}
                        rounded="full"
                        boxSize="48px"
                    />
                    <IconButton
                        aria-label="Next"
                        icon={<ChevronRightIcon boxSize={6} />}
                        onClick={handleNext}
                        bg="rgba(0,0,0,0.18)"
                        color="white"
                        border="1px solid rgba(255,255,255,0.35)"
                        _hover={{ bg: "rgba(0,0,0,0.28)" }}
                        rounded="full"
                        boxSize="48px"
                    />
                </Flex>

            </Container>
        </Box>
    );
}
