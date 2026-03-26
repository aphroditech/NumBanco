import React, { useEffect, useRef, useState } from "react";
import {
    Box,
    Flex,
    Text,
    Image,
    Container,
    Heading,
} from "@chakra-ui/react";

import { baseSlides } from "variables/slideContent";

export default function Slide() {
    const slideWidth = 360;
    const autoScrollRef = useRef(null);
    const sliderRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [startScrollLeft, setStartScrollLeft] = useState(0);
    const scrollSpeed = 0.6; // px per tick (16ms)

    /* 🔁 Duplicate slides for seamless loop */
    const slides = [...baseSlides, ...baseSlides];

    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        autoScrollRef.current = window.setInterval(() => {
            if (isDragging || isPaused) return;
            const loopPoint = slider.scrollWidth / 2;
            if (loopPoint <= 0) return;
            const next = slider.scrollLeft + scrollSpeed;
            slider.scrollLeft = next >= loopPoint ? next - loopPoint : next;
        }, 16);

        return () => {
            if (autoScrollRef.current) {
                window.clearInterval(autoScrollRef.current);
            }
        };
    }, [isDragging, isPaused, scrollSpeed, slides.length]);

    useEffect(() => {
        const handlePointerUp = () => setIsDragging(false);
        window.addEventListener("mouseup", handlePointerUp);
        window.addEventListener("touchend", handlePointerUp);
        window.addEventListener("touchcancel", handlePointerUp);
        return () => {
            window.removeEventListener("mouseup", handlePointerUp);
            window.removeEventListener("touchend", handlePointerUp);
            window.removeEventListener("touchcancel", handlePointerUp);
        };
    }, []);

    return (
        <Box as="section" bg="#ffffff" aria-labelledby="features-heading">
            <Container maxW="7xl" py={20}>
                {/* HEADER */}
                <Flex justify="flex-start" align="center" mb={8}>
                    <Heading as="h2" id="features-heading" color="#0b1f3a">Why Bet With NumBanco</Heading>
                </Flex>

                {/* SLIDER */}
                <Box
                    position="relative"
                    overflow="visible"
                    _before={{
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "120px",
                        bgGradient: "linear(to-r, #ffffff 0%, rgba(255,255,255,0) 100%)",
                        pointerEvents: "none",
                        zIndex: 2,
                    }}
                    _after={{
                        content: '""',
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "120px",
                        bgGradient: "linear(to-l, #ffffff 0%, rgba(255,255,255,0) 100%)",
                        pointerEvents: "none",
                        zIndex: 2,
                    }}
                >
                    <Box
                        ref={sliderRef}
                        overflowX="auto"
                        overflowY="visible"
                        py={4}
                        cursor={isDragging ? "grabbing" : "grab"}
                        userSelect="none"
                        sx={{
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                            "&::-webkit-scrollbar": {
                                display: "none",
                            },
                        }}
                        onMouseDown={(e) => {
                            if (!sliderRef.current) return;
                            setIsDragging(true);
                            setDragStartX(e.pageX - sliderRef.current.offsetLeft);
                            setStartScrollLeft(sliderRef.current.scrollLeft);
                        }}
                        onMouseMove={(e) => {
                            if (!isDragging || !sliderRef.current) return;
                            e.preventDefault();
                            const x = e.pageX - sliderRef.current.offsetLeft;
                            const walk = x - dragStartX;
                            const loopPoint = sliderRef.current.scrollWidth / 2;
                            let next = startScrollLeft - walk;
                            if (loopPoint > 0) {
                                if (next < 0) next += loopPoint;
                                if (next >= loopPoint) next -= loopPoint;
                            }
                            sliderRef.current.scrollLeft = next;
                        }}
                        onTouchStart={(e) => {
                            if (!sliderRef.current) return;
                            setIsDragging(true);
                            setDragStartX(e.touches[0].pageX - sliderRef.current.offsetLeft);
                            setStartScrollLeft(sliderRef.current.scrollLeft);
                        }}
                        onTouchMove={(e) => {
                            if (!isDragging || !sliderRef.current) return;
                            const x = e.touches[0].pageX - sliderRef.current.offsetLeft;
                            const walk = x - dragStartX;
                            const loopPoint = sliderRef.current.scrollWidth / 2;
                            let next = startScrollLeft - walk;
                            if (loopPoint > 0) {
                                if (next < 0) next += loopPoint;
                                if (next >= loopPoint) next -= loopPoint;
                            }
                            sliderRef.current.scrollLeft = next;
                        }}
                    >
                        <Flex
                            gap={6}
                            w="max-content"
                        >
                            {slides.map((slide, i) => (
                                <Box
                                    key={i}
                                    as="article"
                                    w={`${slideWidth}px`}
                                    minW={`${slideWidth}px`}
                                    maxW={`${slideWidth}px`}
                                    bg="#ffffff"
                                    borderRadius="2xl"
                                    overflow="hidden"
                                    border="1px solid #e6edf5"
                                    // boxShadow="0 18px 32px rgba(15, 23, 42, 0.12)"
                                    _hover={{ transform: "scale(1.03)" }}
                                    onMouseEnter={() => setIsPaused(true)}
                                    onMouseLeave={() => setIsPaused(false)}
                                    transition="all 0.25s ease"
                                >
                                    
                                    <Image
                                        src={slide.image}
                                        alt={slide.title}
                                        loading="lazy"
                                        w="100%"
                                        h="auto"
                                        objectFit="contain"
                                        draggable={false}
                                    />

                                    <Box p={6}>
                                        <Heading as="h3" size="md" mb={2} color="#0b1f3a">
                                            {slide.title}
                                        </Heading>
                                        <Text as="p" fontSize="sm" color="#475569">
                                            {slide.desc}
                                        </Text>
                                    </Box>
                                </Box>
                            ))}
                        </Flex>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
