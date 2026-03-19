import {
    Flex,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Box,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import React from 'react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import TransactionRow from 'components/Tables/TransactionRow.js';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import wolfnoavilable from '../../../assets/img/wolfnoavilable.png';

function History() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const [transition, setTransition] = useState([]);
    useEffect(() => {
        if (user && user.deposit && user.withdraw) {
            var merged;
            merged = [
                ...user.withdraw.map(d => ({
                    createAt: new Date(d.createAt).toLocaleString(),
                    address: d.wdAddr,
                    amount: d.wdAmount,
                    coin: d.wdCoin,
                    fill: d.wdFill,
                    net: d.wdNet,
                    txhash: d.txhash,
                    type: "withdraw", // optional to track type
                    _id: d._id
                }))
            ];
            merged.sort((a, b) => new Date(b.createAt) - new Date(a.createAt));
            setTransition(merged)
        }
    }, [user])
    return (
        <Card>
            <CardHeader mb='20px'>
                <Flex direction='column' alignSelf='flex-start'>
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                        <RestoreRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Withdraw History
                    </Text>
                </Flex>
            </CardHeader>
            <CardBody>
                {/* Scroll container */}
                <Flex
                    direction="column"
                    w="100%"
                    maxH="420px"    // Adjust height for ~5 rows
                    overflowY="auto"
                    pr="8px"        // So scrollbar doesn’t cover text
                    sx={{
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-track": {
                            background: "transparent",   // no background color
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#555b5e",        // visible thumb
                            borderRadius: "8px",
                        },
                        "&::-webkit-scrollbar-thumb:hover": {
                            background: "#555b5e",
                        },
                    }}
                >
                    {transition.length === 0 ? (
                        // ✅ NO HISTORY STATE
                        <Flex
                            flex="1"
                            direction="column"
                            align="center"
                            justify="center"
                            minH="400px"
                            color="white"
                        >
                            <Box
                                backgroundImage={`url(${wolfnoavilable})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                w="220px"
                                h="220px"
                                opacity={0.85}
                                mb="20px"
                            />
                            <Flex align="center" justify="center" mb="20px">
                                <SpeakerNotesOffRoundedIcon
                                    style={{
                                        fontSize: "20px",
                                        color: "white",
                                        marginRight: "8px",
                                        filter: "drop-shadow(0 0 10px white)",
                                    }} />
                                No transaction found
                            </Flex>
                        </Flex>
                    ) : (
                        <Box overflowY="auto"
                            overflowX="hidden"
                            width="100%"
                            sx={{
                                "&::-webkit-scrollbar": {
                                    width: "6px",
                                },
                                "&::-webkit-scrollbar-thumb": {
                                    background: "#1b254b",
                                    borderRadius: "8px",
                                },
                            }}>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th color="gray.400" borderColor="gray.600" textAlign="center">Coin</Th>
                                        <Th color="gray.400" borderColor="gray.600" textAlign="center">Amount</Th>
                                        <Th color="gray.400" borderColor="gray.600" textAlign="center">Transaction Hash</Th>
                                        <Th color="gray.400" borderColor="gray.600" textAlign="center">Date</Th>
                                        <Th color="gray.400" borderColor="gray.600" textAlign="center">Status</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {transition && transition.map((row, index) => {
                                        return (
                                            <TransactionRow
                                                key={index}
                                                net={row.net}
                                                coin={row.coin}
                                                txhash={row.txhash}
                                                fill={row.fill}
                                                date={row.createAt}
                                                price={row.amount}
                                                type={row.type}
                                            />
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </Flex>
            </CardBody>
        </Card>
    );
}
export default History;