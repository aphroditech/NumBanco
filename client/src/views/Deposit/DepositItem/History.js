import {
    Flex,
    Text,
    Table,
    TableContainer,
    Thead,
    Tbody,
    Tr,
    Th,
    Box,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import TransactionRow from 'components/Tables/TransactionRow.js';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import SubjectRoundedIcon from '@mui/icons-material/SubjectRounded';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import wolfnoavilable from '../../../assets/img/wolfnoavilable.png';

function History() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const [transition, setTransition] = useState([]);

    useEffect(() => {
        if (user?.deposit?.length) {
            const merged = user.deposit.map(d => ({
                createAt: d.createAt,
                address: d.depAddr,
                amount: d.depAmount,
                coin: d.depCoin,
                txhash: d.depTxH,
                fill: d.depFill,
                net: d.depNet,
                type: "deposit",
                _id: d._id
            }));

            merged.sort((a, b) => new Date(b.createAt) - new Date(a.createAt));
            setTransition(merged);
        } else {
            setTransition([]); // ✅ reset if no data
        }
    }, [user]);

    return (
        <Card>
            <CardHeader mb="20px">
                <Flex direction="column" alignSelf="flex-start">
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                        <RestoreRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Deposit History
                    </Text>
                </Flex>
            </CardHeader>

            <CardBody>
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
                    <Flex
                        direction="column"
                        w="100%"
                    >
                        <TableContainer mt={4} overflowY="auto" maxHeight="760px" overflowX="hidden" sx={{
                            "&::-webkit-scrollbar": {
                                width: "6px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                background: "#555b5e",
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
                                    {transition.map((row, index) => (
                                        <TransactionRow
                                            key={`${row._id}-${row.createAt}-${index}`}  // ✅ unique key combining _id, timestamp, and index
                                            net={row.net}
                                            coin={row.coin}
                                            fill={row.fill}
                                            date={row.createAt}
                                            txhash={row.txhash}
                                            price={row.amount}
                                            type={row.type}
                                        />
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </Flex>
                )}
            </CardBody>
        </Card>
    );
}

export default History;
