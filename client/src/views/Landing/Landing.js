// Landing.js
import React, { Suspense, lazy } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import AnimatedSection from "components/AnimatedSection";
import SEO from "components/SEO";

// Critical above-fold components - load immediately
import Navbar from "./Items/Navbar";
import Hero from "./Items/Hero";

// Below-fold components - lazy load for better performance
const Slide = lazy(() => import("./Items/Slide."));
const Concept = lazy(() => import("./Items/Concept"));
const Card = lazy(() => import("./Items/Card"));
const Price = lazy(() => import("./Items/Price"));
const FAQs = lazy(() => import("./Items/FAQs"));
const Footer = lazy(() => import("./Items/Footer"));
const ScrollToTop = lazy(() => import("./Items/ScrollToTop"));

// Loading fallback component
const LoadingFallback = () => (
    <Center minH="200px">
        <Spinner size="xl" color="#00d4ff" thickness="4px" />
    </Center>
);



export default function LandingPage() {
    const topCurveH = 180;
    return (
        <>
            <SEO />
            <Box as="main" minH="100vh" bg="#ffffff" color="#0b1f3a">
                {/* HERO */}
                <Box bg="#ffffff">
                    <AnimatedSection duration={0.8}><Navbar /></AnimatedSection>
                    <Box
                        bg="black"
                        color="white"
                        position="relative"
                        overflow="hidden"
                        pb={{ base: 6, md: 10 }}
                        clipPath="ellipse(120% 100% at 10% 0%)"
                    >
                        <AnimatedSection duration={0.8}><Hero /></AnimatedSection>
                    </Box>
                </Box>

                {/* FEATURES / TILES */}
                <Box bg="#ffffff">
                    <Suspense fallback={<LoadingFallback />}>
                        <AnimatedSection y={160} duration={0.6}><Slide /></AnimatedSection>
                    </Suspense>
                </Box>

                {/* CONCEPT / ADVANTAGE */}
                <Box>
                    <Suspense fallback={<LoadingFallback />}>
                        <AnimatedSection y={160} duration={0.6}><Concept /><Card /></AnimatedSection>
                    </Suspense>
                    {/* <Suspense fallback={<LoadingFallback />}>
                        <AnimatedSection y={160} duration={0.6}><Card /></AnimatedSection>
                    </Suspense> */}
                </Box>

                {/* PRICE */}
                <Box
                    bg="#000000"
                    color="white"
                    position="relative"
                    overflow="hidden"
                    pt={{ base: topCurveH - 12, md: topCurveH - 14 }}
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
                >
                    <Suspense fallback={<LoadingFallback />}>
                        <AnimatedSection y={160} duration={0.6}><Price /></AnimatedSection>
                    </Suspense>
                </Box>

                {/* FAQ */}
                <Box bg="#ffffff"
                    pt={{ base: topCurveH - 12, md: topCurveH - 14 }}
                    color="white"
                    position="relative"
                    overflow="hidden"
                    // pb={{ base: 72, md: 88 }}
                    _before={{
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "0px",
                        height: `${topCurveH}px`,
                        // White curve "cut-in" over black background
                        background: "black",
                        // Invert curve direction: curve sits on TOP edge
                        clipPath: "ellipse(60% 75% at 50% 0%)",
                        pointerEvents: "none",
                        zIndex: 0,
                    }}
                >
                    <Suspense fallback={<LoadingFallback />}>
                        <AnimatedSection y={160} duration={0.8}><FAQs /></AnimatedSection>
                    </Suspense>
                </Box>

                {/* FOOTER */}
                <Box bg="#ffffff">
                    <Suspense fallback={<LoadingFallback />}>
                        <Footer />
                    </Suspense>
                </Box>

                <Suspense fallback={null}>
                    <ScrollToTop />
                </Suspense>
            </Box>
        </>
    );
}
