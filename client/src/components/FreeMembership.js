import { Box, Avatar } from "@chakra-ui/react";
import { useEffect, useState } from "react";

const FreeAvatar = ({
    src,
    size = "120px",
    delay = "0s",
    glowColor = "rgba(0, 212, 255, 1)",
    glowSize = 10, // 🔽 reduced blur
}) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <Box position="relative" w={size} h={size}>
        {/* 🔆 Compact glow */}
        <Box
            position="absolute"
            inset="-18%" // 🔽 reduced spread
            borderRadius="50%"
            zIndex={0}
            sx={
            ready
                ? {
                    background: `radial-gradient(
                    circle at center,
                    ${glowColor} 0%,
                    ${glowColor.replace("1)", "0.8)")} 15%,
                    ${glowColor.replace("1)", "0.45)")} 35%,
                    transparent 48%
                    )`,
                    filter: `blur(${glowSize}px)`,
                    animation: "centerGlow 3s ease-in-out infinite",
                    animationDelay: delay,

                    "@keyframes centerGlow": {
                    "0%": { transform: "scale(0.75)", opacity: 0.6 },
                    "50%": { transform: "scale(0.85)", opacity: 0.9 },
                    "100%": { transform: "scale(0.75)", opacity: 0.6 },
                    },
                }
                : {}
            }
        />

        {/* 🎯 Avatar */}
        <Box
            position="absolute"
            top="66%"
            left="67%"
            transform="translate(-50%, -50%)"
            w="92%"
            h="92%"
            borderRadius="50%"
            zIndex={1}
        >
            <Avatar src={src} loading="eager" w="64%" h="64%" bg="transparent" />
        </Box>
        </Box>
    );
};

export default FreeAvatar;