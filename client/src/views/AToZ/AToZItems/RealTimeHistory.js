import {
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import AToZRealViewRow from 'components/Tables/AToZRealViewRow';
import { getAToZResults } from 'action/AtoZActions';
import { useAblyAtoZResults } from 'hooks/useAblyAtoZResults';
import { useHistory } from 'react-router-dom';
import Loading from 'components/Loading/Loading';

function RealTimeHistory() {
    const { aToZResults, setAToZResults } = useAblyAtoZResults();
    const history = useHistory();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(async() => {
        let isMounted = true;
        const results = await getAToZResults(history);
        if (isMounted) {
            setAToZResults(results || []);
            setIsLoading(false);
        }
        return () => { isMounted = false; };
    }, [history]);

    if (isLoading) {
        return <Loading />;
    }

    const maxRows = 17;
    const rowsToRender = (Array.isArray(aToZResults) ? aToZResults : []).slice(0, maxRows);

    return (
        <Box
            w="100%"
            maxW="100%"
            h="100%"
            minH={0}
            flex={1}
            bg="#2b2b2b"
            borderRadius="14px"
            border="1px solid rgba(255,255,255,0.1)"
            boxShadow="none"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            p="12px"
            pt="16px"
        >
            <Text
                px="10px"
                pb="6px"
                fontSize="sm"
                fontWeight="800"
                color="rgba(255,255,255,0.92)"
                letterSpacing="0.02em"
                flexShrink={0}
            >
                Live Results
            </Text>
            <Box
                overflowX="hidden"
                width="100%"
                flex="1"
                minH="0"
                overflowY="auto"
                sx={{
                    "&::-webkit-scrollbar": { display: "none" },
                    "msOverflowStyle": "none",
                    "scrollbarWidth": "none",
                }}
            >
                <Table
                    variant="unstyled"
                    color="#fff"
                    width="100%"
                    sx={{ tableLayout: "fixed" }}
                >
                    <Thead>
                        <Tr borderBottom="1px solid rgba(255,255,255,0.12)">
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" whiteSpace="nowrap" w="42%" textTransform="uppercase" letterSpacing="0.06em">
                                User
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="center" whiteSpace="nowrap" w="28%" textTransform="uppercase" letterSpacing="0.06em">
                                Result
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="right" whiteSpace="nowrap" w="30%" textTransform="uppercase" letterSpacing="0.06em">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {rowsToRender.map((row, index) => {
                            return (
                                <AToZRealViewRow
                                    key={index}
                                    userName={row.userName}
                                    avatar={row.avatar}
                                    result={row.multiplier}
                                    winAmount={row.winAmount}
                                />
                            );
                        })}
                    </Tbody>
                </Table>
            </Box>
        </Box>
    );
}

export default RealTimeHistory;