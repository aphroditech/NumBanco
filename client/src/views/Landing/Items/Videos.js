import React, { useEffect, useRef, useState } from "react";
import { Box, Container, Flex, Heading, Text } from "@chakra-ui/react";

import Video1 from "assets/video/advertise1.mp4";
import Video2 from "assets/video/advertise1.mp4";
import Video3 from "assets/video/advertise1.mp4";
import Video4 from "assets/video/advertise1.mp4";
import Video5 from "assets/video/advertise1.mp4";
import Video6 from "assets/video/advertise1.mp4";

export default function Videos() {
    const slideWidth = 360;
    const scrollSpeed = 0.6; // px per tick (16ms)

    const autoScrollRef = useRef(null);
    const sliderRef = useRef(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [startScrollLeft, setStartScrollLeft] = useState(0);

    const ads = [
        { src: Video1, title: "Advertisement 1" },
        { src: Video2, title: "Advertisement 2" },
        { src: Video3, title: "Advertisement 3" },
        { src: Video4, title: "Advertisement 4" },
        { src: Video5, title: "Advertisement 5" },
        { src: Video6, title: "Advertisement 6" },
    ];

    // Duplicate for seamless loop.
    const slides = [...ads, ...ads];

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
            if (autoScrollRef.current) window.clearInterval(autoScrollRef.current);
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
        <Box as="section" bg="#000000" py={20}>
            <Container maxW="7xl">
                <Flex justify="flex-start" align="center" mb={8} gap={3}>
                    <Heading as="h2" size="md" color="#ffffff">
                        Advertisements
                    </Heading>
                    <Text color="rgba(255,255,255,0.6)" fontSize="sm">
                        Drag to explore • Videos auto-play (muted)
                    </Text>
                </Flex>

                <Box
                    position="relative"
                    _before={{
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "120px",
                        bgGradient: "linear(to-r, #000000 0%, rgba(0,0,0,0) 100%)",
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
                        bgGradient: "linear(to-l, #000000 0%, rgba(0,0,0,0) 100%)",
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
                            "&::-webkit-scrollbar": { display: "none" },
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
                        <Flex gap={6} w="max-content">
                            {slides.map((ad, i) => (
                                <Box
                                    key={`${ad.title}-${i}`}
                                    as="article"
                                    w={`${slideWidth}px`}
                                    minW={`${slideWidth}px`}
                                    maxW={`${slideWidth}px`}
                                    borderRadius="2xl"
                                    overflow="hidden"
                                    border="1px solid rgba(255,255,255,0.12)"
                                    bg="rgba(10, 16, 24, 0.9)"
                                    transition="all 0.25s ease"
                                    _hover={{ transform: "scale(1.03)" }}
                                    onMouseEnter={() => setIsPaused(true)}
                                    onMouseLeave={() => setIsPaused(false)}
                                >
                                    <Box
                                        position="relative"
                                        bg="#000"
                                        sx={{
                                            aspectRatio: "16 / 9",
                                        }}
                                    >
                                        <video
                                            src={ad.src}
                                            muted
                                            loop
                                            autoPlay
                                            playsInline
                                            preload="metadata"
                                            controls={false}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                display: "block",
                                            }}
                                        />
                                    </Box>

                                    <Box p={5}>
                                        <Heading as="h3" size="sm" mb={2} color="#ffffff">
                                            {ad.title}
                                        </Heading>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.65)">
                                            Watch the latest promotion.
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

