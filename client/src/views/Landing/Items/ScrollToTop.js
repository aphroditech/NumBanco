import React, { useEffect, useState } from "react";
import { Box, Image } from "@chakra-ui/react";
import toTop from "assets/img/totop.png";

export default function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
        setVisible(window.scrollY > 300);
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
        top: 0,
        behavior: "smooth",
        });
    };

    return (
        <Box
            position="fixed"
            bottom="32px"
            left="3%"
            zIndex="9999"
            opacity={visible ? 1 : 0}
            transform={visible ? "translateY(0)" : "translateY(20px)"}
            transition="all 0.3s ease"
            cursor="pointer"
            onClick={scrollToTop}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{
                transform: "scale(1.15) translateY(-4px)",
                filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.25))",
            }}
        >
        <Image
            src={toTop}
            alt="Scroll to top"
            loading="lazy"
            transition="all 0.25s ease"
        />
        </Box>
    );
}
