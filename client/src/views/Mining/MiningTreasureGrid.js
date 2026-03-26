import React from 'react';
import { Box, Button, Grid, Image } from '@chakra-ui/react';
import { motion } from 'framer-motion';
const jackalImage = '/img/Jackal/jackal.png';

const METAL_FRAME = {
    bg: 'linear-gradient(168deg, #6b4e38 0%, #2d1a12 28%, #4a3224 55%, #1f120c 100%)',
    boxShadow: `
        0 16px 48px rgba(0,0,0,0.65),
        inset 0 2px 0 rgba(255, 200, 160, 0.14),
        inset 0 -3px 12px rgba(0,0,0,0.55)
    `,
};

const INNER_GROOVE = {
    bg: 'linear-gradient(180deg, #0d0806 0%, #1a110c 100%)',
    boxShadow: 'inset 0 0 24px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)',
};

/** Small rivet dot on the outer frame */
function Rivet({ left, right, top, bottom, sx, size = '9px' }) {
    return (
        <Box
            position="absolute"
            left={left}
            right={right}
            top={top}
            bottom={bottom}
            w={size}
            h={size}
            borderRadius="full"
            pointerEvents="none"
            zIndex={2}
            bg="radial-gradient(circle at 30% 30%, #e8c86a 0%, #8a6238 45%, #1a0f08 78%)"
            boxShadow="inset 0 -2px 3px rgba(0,0,0,0.85), 0 1px 1px rgba(255,220,180,0.25)"
            sx={sx}
        />
    );
}

/** Hidden face — identical for all 16 tiles */
function StoneTileFace({ canFlip }) {
    return (
        <Box
            position="absolute"
            inset={0}
            borderRadius="4px"
            overflow="hidden"
            bg="#c4ae88"
            backgroundImage={`
                linear-gradient(145deg, rgba(255,255,255,0.22) 0%, transparent 42%, rgba(0,0,0,0.12) 100%),
                repeating-linear-gradient(
                    -12deg,
                    transparent,
                    transparent 2px,
                    rgba(90, 70, 50, 0.04) 2px,
                    rgba(90, 70, 50, 0.04) 3px
                )
            `}
            border="1px solid rgba(62, 43, 28, 0.55)"
            boxShadow={`
                inset 6px 6px 16px rgba(0,0,0,0.38),
                inset -4px -4px 12px rgba(255, 235, 210, 0.28),
                0 3px 6px rgba(0,0,0,0.35)
            `}
        >
            <Box
                position="absolute"
                inset={0}
                bg="radial-gradient(ellipse 120% 80% at 30% 25%, rgba(255,240,210,0.35) 0%, transparent 50%)"
                pointerEvents="none"
            />
            <Box
                position="absolute"
                inset={0}
                opacity={canFlip ? 1 : 0.55}
                bg="radial-gradient(circle at 50% 15%, rgba(255,220,180,0.12) 0%, transparent 45%)"
                pointerEvents="none"
            />
            <motion.div
                animate={canFlip ? { opacity: [0.88, 1, 0.88] } : undefined}
                transition={{ duration: 1.35, repeat: canFlip ? Infinity : 0 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box
                    fontSize="22px"
                    fontWeight="900"
                    lineHeight="1"
                    color="rgba(55, 42, 28, 0.88)"
                    textShadow="0 1px 0 rgba(255,255,255,0.35), 0 -1px 2px rgba(0,0,0,0.25)"
                >
                    ?
                </Box>
            </motion.div>
        </Box>
    );
}

/**
 * 4×4 treasure-hunter tile board: matching stone faces, bronze frame, rivets; jackal tile shows image on reveal.
 */
export default function MiningTreasureGrid({
    tiles,
    gameState,
    flippedCount,
    maxTurns,
    jackalIndex,
    jackalCelebrationKey,
    flipTile,
}) {
    return (
        <Box position="relative" w="100%" maxW="400px" mx="auto" px={{ base: 0, sm: 1 }}>
            {/* Outer weathered metal frame */}
            <Box
                position="relative"
                borderRadius="10px"
                p={{ base: '10px', md: '12px' }}
                {...METAL_FRAME}
            >
                <Rivet left="8px" top="8px" />
                <Rivet left="50%" top="6px" sx={{ transform: 'translateX(-50%)' }} />
                <Rivet right="8px" top="8px" />
                <Rivet left="6px" top="50%" sx={{ transform: 'translateY(-50%)' }} />
                <Rivet right="6px" top="50%" sx={{ transform: 'translateY(-50%)' }} />
                <Rivet left="8px" bottom="8px" />
                <Rivet left="50%" bottom="6px" sx={{ transform: 'translateX(-50%)' }} />
                <Rivet right="8px" bottom="8px" />

                <Box borderRadius="6px" p={{ base: '8px', md: '10px' }} {...INNER_GROOVE}>
                    {/* Grid dividers read as cast metal between cells */}
                    <Grid
                        templateColumns="repeat(4, 1fr)"
                        gap={{ base: '7px', md: '9px' }}
                        bg="linear-gradient(180deg, #2a1c14 0%, #1a100c 100%)"
                        p={{ base: '8px', md: '10px' }}
                        borderRadius="4px"
                        boxShadow="inset 0 2px 10px rgba(0,0,0,0.9)"
                    >
                        {tiles.map((revealed, index) => {
                            const canFlip =
                                gameState === 'playing' && revealed === null && flippedCount < maxTurns;
                            const isJackal = revealed === true;

                            return (
                                <Button
                                    key={index}
                                    variant="unstyled"
                                    p="0"
                                    minW="0"
                                    w="100%"
                                    h={{ base: '72px', sm: '76px', md: '82px' }}
                                    borderRadius="0"
                                    onClick={() => flipTile(index)}
                                    _focusVisible={
                                        canFlip
                                            ? {
                                                  boxShadow:
                                                      '0 0 0 3px rgba(201, 162, 74, 0.45), 0 0 22px rgba(0, 0, 0, 0.5)',
                                              }
                                            : undefined
                                    }
                                >
                                    <Box w="100%" h="100%" position="relative" style={{ perspective: '1000px' }}>
                                        <motion.div
                                            initial={false}
                                            animate={{
                                                rotateY: revealed === null ? 0 : 180,
                                                ...(gameState === 'won' &&
                                                jackalIndex === index &&
                                                jackalCelebrationKey > 0
                                                    ? {
                                                          x: [0, -4, 4, -3, 0],
                                                          y: [0, 2, -2, 1, 0],
                                                          rotateZ: [0, -2, 2, -1, 0],
                                                          scale: [1, 1.06, 0.98, 1.03, 1],
                                                      }
                                                    : {}),
                                            }}
                                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                            whileHover={canFlip ? { scale: 1.02 } : undefined}
                                            whileTap={canFlip ? { scale: 0.98 } : undefined}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                position: 'relative',
                                                transformStyle: 'preserve-3d',
                                            }}
                                        >
                                            {/* Front (hidden) */}
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                style={{ backfaceVisibility: 'hidden' }}
                                                transform="translateZ(2px)"
                                            >
                                                <StoneTileFace canFlip={canFlip} />
                                            </Box>

                                            {/* Back (revealed) */}
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                borderRadius="4px"
                                                style={{
                                                    transform: 'rotateY(180deg) translateZ(2px)',
                                                    backfaceVisibility: 'hidden',
                                                }}
                                                overflow="hidden"
                                                bg={isJackal ? '#2a1210' : '#0f1814'}
                                                border={
                                                    isJackal
                                                        ? '1px solid rgba(180, 90, 55, 0.65)'
                                                        : '1px solid rgba(90, 140, 110, 0.45)'
                                                }
                                                boxShadow={
                                                    isJackal
                                                        ? 'inset 0 0 24px rgba(0,0,0,0.85), inset 0 -8px 20px rgba(120,40,20,0.35)'
                                                        : 'inset 0 0 20px rgba(0,0,0,0.75), inset 0 -6px 16px rgba(40,120,90,0.2)'
                                                }
                                            >
                                                <Box
                                                    position="absolute"
                                                    inset={0}
                                                    bg={
                                                        isJackal
                                                            ? 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(180,70,40,0.45) 0%, transparent 55%)'
                                                            : 'radial-gradient(circle at 50% 35%, rgba(80,200,140,0.2) 0%, transparent 50%)'
                                                    }
                                                />
                                                {revealed !== null && (
                                                    <motion.div
                                                        key={isJackal ? `jackal-${jackalCelebrationKey}` : 'safe'}
                                                        initial={{ scale: 0.92, opacity: 0.4 }}
                                                        animate={{
                                                            scale:
                                                                isJackal &&
                                                                gameState === 'won' &&
                                                                jackalIndex === index &&
                                                                jackalCelebrationKey > 0
                                                                    ? [1, 1.16, 0.95, 1.1, 1]
                                                                    : isJackal
                                                                      ? [1, 1.08, 1]
                                                                      : [1, 1.04, 1],
                                                            opacity: 1,
                                                        }}
                                                        transition={{
                                                            duration:
                                                                isJackal && gameState === 'won' ? 0.35 : 0.35,
                                                        }}
                                                        style={{
                                                            position: 'relative',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            height: '100%',
                                                        }}
                                                    >
                                                        {isJackal ? (
                                                            <Image
                                                                src={jackalImage}
                                                                alt="Jackal"
                                                                maxH="88%"
                                                                maxW="88%"
                                                                w="auto"
                                                                h="auto"
                                                                objectFit="contain"
                                                                draggable={false}
                                                                userSelect="none"
                                                                filter="drop-shadow(0 4px 12px rgba(0,0,0,0.9))"
                                                            />
                                                        ) : (
                                                            <Box
                                                                fontSize="30px"
                                                                lineHeight="1"
                                                                filter="drop-shadow(0 2px 8px rgba(0,80,60,0.35))"
                                                            >
                                                                ✦
                                                            </Box>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </Box>
                                        </motion.div>
                                    </Box>
                                </Button>
                            );
                        })}
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}
