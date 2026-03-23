import {
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Flex,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import React, { useEffect, useState, useRef } from 'react';
import AToZRealViewRow from 'components/Tables/AToZRealViewRow';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { getAToZResults } from 'action/AtoZActions';
import { useAblyAtoZResults } from 'hooks/useAblyAtoZResults';
import { useHistory } from 'react-router-dom';
import Loading from 'components/Loading/Loading';

function RealTimeHistory() {
    const { aToZResults, setAToZResults } = useAblyAtoZResults();
    const history = useHistory();

    useEffect( async () => {
        let isMounted = true;
        const res = await getAToZResults(history);
        if (isMounted) {
            setAToZResults(res.aToZResults);
        }
        return () => { isMounted = false; };
    }, [history]);
    
    return (
        <Card
            p="24px"
            pt="30px"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            // h="100%"
            minH="0"
            flex="1"
        >
            <Box overflowX="hidden" width="100%" flex="1" minH="0" overflowY="auto">
                <Table
                variant="unstyled"
                color="#fff"
                width="100%"
                sx={{ tableLayout: "fixed" }}
                >
                    <Thead>
                        <Tr style={{ textAlignLast: "center" }}>
                            <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                User
                            </Th>
                            <Th color="white" textAlign="left" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                Result
                            </Th>
                            <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                    {aToZResults.map((row, index) => {
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
        </Card>
    );
}

export default RealTimeHistory;