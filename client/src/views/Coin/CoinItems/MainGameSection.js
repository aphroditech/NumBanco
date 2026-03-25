import React, { useRef, useState } from 'react';
import Card from 'components/Card/Card.js';
import { VStack, Text, Box, HStack, Image, Button, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';

import CoinHeadImage from 'assets/img/Coin/head.png';
import CoinTailImage from 'assets/img/Coin/tail.png';

const MotionImage = motion(Image);

export default function MainGameSection() {
    const amounts = ['0.05', '0.1', '0.25', '0.5', '1'];
    const [coinFace, setCoinFace] = useState('HEADS');
    const [isTossing, setIsTossing] = useState(false);
    const [tossSeed, setTossSeed] = useState(0);
    const pendingFaceRef = useRef('HEADS');

    const handleThrowCoin = () => {
        if (isTossing) return;
        setIsTossing(true);
        // Simulate a toss result when the throw animation completes.
        pendingFaceRef.current = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        setTossSeed((v) => v + 1);
    };

    return (
        <Card
            p={{ base: '12px', md: '16px' }}
            minH={{ base: '420px', md: '750px' }}
            h="100%"
            display="flex"
            flexDirection="column"
            bg="#03070f"
            border="1px solid rgba(0, 212, 255, 0.2)"
            overflow="hidden"
        >
            <VStack align="stretch" spacing={0} h="100%">
                <Box flex="1" minH="0" position="relative" py={{ base: 6, md: 8 }}>
                    <VStack spacing={{ base: 6, md: 10 }} h="100%" justify="space-between">
                        <HStack spacing={2}>
                            {['#13d8ff', '#13d8ff', '#13d8ff', '#ff3f76', '#13d8ff'].map((c, i) => (
                                <Box
                                    key={i}
                                    w={{ base: '16px', md: '18px' }}
                                    h={{ base: '16px', md: '18px' }}
                                    borderRadius="full"
                                    border="2px solid"
                                    borderColor={c}
                                    boxShadow={`0 0 10px ${c}`}
                                    bg={i === 3 ? 'transparent' : 'rgba(19, 216, 255, 0.1)'}
                                />
                            ))}
                        </HStack>

                        <Box
                            w={{ base: '300px', md: '300px' }}
                            h={{ base: '300px', md: '300px' }}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            position="relative"
                        >
                            <MotionImage
                                key={tossSeed}
                                src={coinFace === 'HEADS' ? CoinHeadImage : CoinTailImage}
                                alt="Coin"
                                w={{ base: '300px', md: '250px' }}
                                h={{ base: '300px', md: '250px' }}
                                objectFit="contain"
                                filter="drop-shadow(0 0 26px rgba(19,216,255,0.7))"
                                initial={{ y: 0, rotateY: 0, rotateX: 0, scale: 1 }}
                                animate={
                                    isTossing
                                        ? {
                                              // Spin in place and stop (no up/down motion)
                                              y: [0, 0, 0, 0, 0],
                                              rotateY: [0, 900, 1800, 2520, 2880],
                                              rotateX: [0, 12, 24, 10, 0],
                                              scale: [1, 0.98, 0.95, 0.98, 1],
                                          }
                                        : { y: 0, rotateY: 0, rotateX: 0, scale: 1 }
                                }
                                transition={{
                                    duration: 1.15,
                                    times: [0, 0.3, 0.58, 0.82, 1],
                                    ease: [0.2, 0.9, 0.3, 1],
                                }}
                                onAnimationComplete={() => {
                                    if (!isTossing) return;
                                    setCoinFace(pendingFaceRef.current);
                                    setIsTossing(false);
                                }}
                            />
                        </Box>

                        <VStack spacing={5} w="100%" maxW="560px" px={{ base: 2, md: 4 }}>
                            <HStack spacing={{ base: 2, md: 3 }} justify="center" w="100%">
                                {amounts.map((amt, idx) => (
                                    <Box
                                        key={amt}
                                        flex="1"
                                        maxW="88px"
                                        minW="58px"
                                        h={{ base: '44px', md: '52px' }}
                                        borderRadius="md"
                                        border={idx === 4 ? '1px solid rgba(255, 56, 112, 0.55)' : '1px solid rgba(255,255,255,0.15)'}
                                        bg="rgba(3, 8, 16, 0.75)"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text
                                            color={idx === 4 ? 'rgba(255, 88, 136, 0.9)' : 'rgba(255,255,255,0.55)'}
                                            fontWeight="700"
                                        >
                                            {amt}
                                        </Text>
                                    </Box>
                                ))}
                            </HStack>

                            <Flex gap={{ base: 3, md: 4 }} w="100%">
                                <Button
                                    flex="1"
                                    h={{ base: '48px', md: '56px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(180deg, rgba(62,18,27,0.92) 0%, rgba(45,12,23,0.96) 100%)"
                                    color="rgba(255,255,255,0.92)"
                                    border="2px solid rgba(255, 57, 96, 0.55)"
                                    fontSize={{ base: 'xl', md: '2xl' }}
                                    fontWeight="900"
                                    letterSpacing="0.02em"
                                    boxShadow="0 0 0 1px rgba(255, 61, 109, 0.35), inset 0 0 18px rgba(255, 46, 99, 0.2), 0 0 18px rgba(255, 46, 99, 0.35)"
                                    _hover={{
                                        bg: 'linear-gradient(180deg, rgba(75,22,33,0.96) 0%, rgba(55,16,28,0.98) 100%)',
                                        boxShadow: '0 0 0 1px rgba(255, 61, 109, 0.45), inset 0 0 24px rgba(255, 46, 99, 0.28), 0 0 24px rgba(255, 46, 99, 0.45)',
                                        transform: 'translateY(-1px)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    isDisabled={isTossing}
                                    onClick={handleThrowCoin}
                                >
                                    HEADS
                                </Button>
                                <Button
                                    flex="1"
                                    h={{ base: '48px', md: '56px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(180deg, rgba(15,56,66,0.92) 0%, rgba(10,41,54,0.96) 100%)"
                                    color="rgba(255,255,255,0.92)"
                                    border="2px solid rgba(23, 219, 255, 0.58)"
                                    fontSize={{ base: 'xl', md: '2xl' }}
                                    fontWeight="900"
                                    letterSpacing="0.02em"
                                    boxShadow="0 0 0 1px rgba(23, 219, 255, 0.35), inset 0 0 20px rgba(23, 219, 255, 0.2), 0 0 20px rgba(23, 219, 255, 0.32)"
                                    _hover={{
                                        bg: 'linear-gradient(180deg, rgba(20,67,80,0.96) 0%, rgba(14,50,64,0.98) 100%)',
                                        boxShadow: '0 0 0 1px rgba(23, 219, 255, 0.45), inset 0 0 26px rgba(23, 219, 255, 0.28), 0 0 28px rgba(23, 219, 255, 0.42)',
                                        transform: 'translateY(-1px)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    isDisabled={isTossing}
                                    onClick={handleThrowCoin}
                                >
                                    TAILS
                                </Button>
                            </Flex>
                        </VStack>
                    </VStack>
                </Box>
            </VStack>
        </Card>
    );
}   