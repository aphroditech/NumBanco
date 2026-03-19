import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
    Text,
    Flex,
    Icon,
    Grid,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Box,
} from "@chakra-ui/react";
import { FaRegCalendarAlt } from "react-icons/fa";

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import CardBody from "components/Card/CardBody";
import TransactionRow from "components/Tables/TransactionRow";
import GradientBorder from "components/GradientBorder/GradientBorder";

import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import wolfnoavilable from '../../../assets/img/wolfnoavilable.png';

function Transaction() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const [transition, setTransition] = useState([]);
    const [option, setOption] = useState("all");
    const options = ["all", "deposit", "withdraw"]
    useEffect(() => {
        if (user && user.deposit && user.withdraw) {
            var merged;
            if (option === "all") {
                merged = [
                    ...user.deposit.map(d => ({
                        createAt: d.createAt,
                        address: d.depAddr,
                        amount: d.depAmount,
                        coin: d.depCoin,
                        txhash: d.depTxH || "",
                        fill: d.depFill,
                        net: d.depNet,
                        type: "deposit", // optional to track type
                        _id: d._id
                    })),
                    ...user.withdraw.map(w => ({
                        createAt: w.createAt,
                        address: w.wdAddr,
                        amount: w.wdAmount,
                        coin: w.wdCoin,
                        txhash: w.txhash,
                        fill: w.wdFill,
                        net: w.wdNet,
                        type: "withdraw", // optional to track type
                        _id: w._id
                    }))
                ];
            }
            if (option === "deposit") {
                merged = [
                    ...user.deposit.map(d => ({
                        createAt: d.createAt,
                        address: d.depAddr,
                        amount: d.depAmount,
                        coin: d.depCoin,
                        fill: d.depFill,
                        net: d.depNet,
                        type: "deposit", // optional to track type
                        _id: d._id
                    }))
                ];
            }
            if (option === "withdraw") {
                merged = [
                    ...user.withdraw.map(w => ({
                        createAt: w.createAt,
                        address: w.wdAddr,
                        amount: w.wdAmount,
                        coin: w.wdCoin,
                        fill: w.wdFill,
                        txhash: w.txhash,
                        net: w.wdNet,
                        type: "withdraw", // optional to track type
                        _id: w._id
                    }))
                ];
            }
            merged.sort((a, b) => new Date(b.createAt) - new Date(a.createAt));
            setTransition(merged)
        }
    }, [user, option])

    return (
        <Card>
            <CardHeader mb='12px'>
                <Flex direction='column' w='100%'>
                    <Flex
                        direction={{ sm: "column", lg: "row" }}
                        justify={{ sm: "center", lg: "space-between" }}
                        align={{ sm: "center" }}
                        w='100%'
                    // my={{ md: "12px" }}
                    >
                        <Text color="#00D4FF" textAlign="left"
                            style={{

                            }} fontWeight="bold" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center">
                            <AccountBalanceRoundedIcon
                                style={{
                                    fontSize: "30px",
                                    color: "#00D4FF",
                                    marginRight: "8px",

                                }} />
                            Your Transaction
                        </Text>
                        <Grid gap="12px">
                            <GradientBorder w="100%" borderRadius="20px">
                                <Select
                                    color="white"
                                    bg="#323738"
                                    border="transparent"
                                    borderRadius="20px"
                                    fontSize="sm"
                                    size="lg"
                                    w="100%"
                                    h="34px"
                                    onChange={(e) => setOption(e.target.value)}
                                    sx={{
                                        option: {
                                            backgroundColor: "#323738",
                                            color: "white",
                                            padding: "12px 10px", // ← increases height
                                            fontSize: "16px",
                                            borderRadius: "12px", // ← MAY NOT work on all browsers
                                        },
                                    }}
                                >
                                    {
                                        options.map((opt, i) => (
                                            <option
                                                h="10px"
                                                key={i}
                                                value={opt}
                                                style={{ backgroundColor: "#323738" }}
                                            >
                                                {opt}
                                            </option>
                                        ))
                                    }
                                </Select>
                            </GradientBorder>
                        </Grid>
                    </Flex>
                </Flex>
            </CardHeader>
            <CardBody>
                <Flex
                    direction="column"
                    w="100%"
                    maxH="420px"
                    overflowY="auto"
                    pr="8px"
                    sx={{
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#555b5e",
                            borderRadius: "8px",
                        },
                    }}
                >
                    {transition.length ? (
                        <Box maxH={{ sm: "425px" }}
                            overflowY="auto"
                            overflowX="hidden"
                            width="100%"
                            sx={{
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
                                            key={index}
                                            net={row.net}
                                            coin={row.coin}
                                            fill={row.fill}
                                            date={row.createAt}
                                            price={row.amount}
                                            txhash={row.txhash}
                                            type={row.type}
                                        />
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    ) : (
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

                                    }} />
                                No transaction found
                            </Flex>
                        </Flex>

                    )}
                </Flex>
            </CardBody>
        </Card>
    );
}

export default Transaction;