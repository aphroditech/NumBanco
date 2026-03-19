import { Box, Avatar } from "@chakra-ui/react";
import { useEffect, useState } from "react";

const ShinyAvatar = ({
    src,
    size = "120px",
    delay = "0s",
    glowColor = "rgba(0, 212, 255, 1)",
    glowSize = 18, // slightly larger for spread
}) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <Box position="relative" w={size} h={size}>
        <Box
            position="absolute"
            inset="-18%" // allows glow to expand outward
            borderRadius="50%"
            zIndex={0}
            sx={
            ready
                ? {
                    background: `radial-gradient(
                    circle at center,
                    ${glowColor} 0%,
                    ${glowColor.replace("1)", "0.85)")} 15%,
                    ${glowColor.replace("1)", "0.45)")} 35%,
                    transparent 65%
                    )`,
                    filter: `blur(${glowSize}px)`,
                    animation: "centerGlow 3s ease-in-out infinite",
                    animationDelay: delay,

                    "@keyframes centerGlow": {
                    "0%": { transform: "scale(0.75)", opacity: 1 },
                    "50%": { transform: "scale(0.9)", opacity: 1.3 },
                    "100%": { transform: "scale(0.75)", opacity: 1 },
                    },
                }
                : {}
            }
        />

        {/* Avatar perfectly centered */}
        <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="92%"
            h="92%"
            borderRadius="50%"
            zIndex={1}
        >
            <Avatar src={src} loading="eager" w="100%" h="100%" bg="transparent" />
        </Box>
        </Box>
    );
};

export default ShinyAvatar;