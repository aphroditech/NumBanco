import { motion } from "framer-motion";
import { Box } from "@chakra-ui/react";
import { useInView } from "react-intersection-observer";

const MotionBox = motion(Box);

export default function AnimatedSection({
    children,
    delay = 0,
    y = 40,
    duration = 0.6,
    }) {
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.15,
    });

    return (
        <MotionBox
        ref={ref}
        initial={{ opacity: 0, y }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration, ease: "easeOut", delay }}
        >
        {children}
        </MotionBox>
    );
}
