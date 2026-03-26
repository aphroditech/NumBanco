import React, { useEffect, useRef, useState } from 'react';

import {
    Flex,
    Box,
    Stack,
    Grid,
    GridItem
} from '@chakra-ui/react';

import Card from 'components/Card/Card.js';
import DoveGame from "components/DoveGame";
import RealView from "./DoveItem/RealView";
import DoveHistory from "./DoveItem/History";
import { onlineUser, offlineUser } from 'action/BetActions';

function Dove() {
    const gameWrapRef = useRef(null);
    const gameSceneHeightRef = useRef(null);
    const [gameSceneHeight, setGameSceneHeight] = useState(null);

    useEffect(() => {
        onlineUser(6);
        return () => {
            offlineUser(6);
        };
    }, []);

    useEffect(() => {
        const node = gameWrapRef.current;
        if (!node) return;

        const updateHeight = () => {
            const nextHeight = node.clientHeight || null;
            if (nextHeight !== gameSceneHeightRef.current) {
                gameSceneHeightRef.current = nextHeight;
                setGameSceneHeight(nextHeight);
            }
        };

        updateHeight();
        let rafId = null;
        const onResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                updateHeight();
                rafId = null;
            });
        };
        window.addEventListener("resize", onResize);
        const t1 = setTimeout(updateHeight, 100);
        const t2 = setTimeout(updateHeight, 400);
        return () => {
            window.removeEventListener("resize", onResize);
            clearTimeout(t1);
            clearTimeout(t2);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <Flex flexDirection='column' pt={{ base: '120px', md: '75px' }}>
            <Box px={{ base: '16px', md: '24px' }} w="100%" maxW="100%">
                <Grid
                    templateAreas={{
                        base: '"game" "realview"',
                        md: '"game realview"',
                    }}
                    templateColumns={{
                        base: '1fr',
                        md: '6fr 1.35fr',
                    }}
                    templateRows={{
                        base: 'auto auto',
                        md: 'auto',
                    }}
                    gap={{ base: '16px', md: '24px' }}
                    my='18px'
                    w="100%"
                    alignItems="start"
                >
                    <GridItem area="game" minW={0} display="flex">
                        <Card overflow="hidden" w="100%" boxShadow="none" border="1px solid rgba(255,255,255,0.1)" borderRadius="16px" bg="#2a2a2a">
                            <Stack spacing={4}>
                                <Box
                                    ref={gameWrapRef}
                                    w="100%"
                                    maxW="1520px"
                                    mx="auto"
                                    minW={0}
                                    overflow="hidden"
                                    borderRadius="md"
                                >
                                    <DoveGame />
                                </Box>
                            </Stack>
                        </Card>
                    </GridItem>
                    <GridItem area="realview" minH="250px" maxW={{ md: '320px', xl: '340px' }} justifySelf="end" w="100%" h="100%" display="flex">
                        <RealView sceneHeight={gameSceneHeight} />
                    </GridItem>
                </Grid>
                <DoveHistory />
            </Box>
        </Flex>
    );
}

export default Dove;