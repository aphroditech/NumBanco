import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import {
    Flex,
    Grid,
    Text,
    SlideFade,
    Stat,
    StatLabel,
    StatNumber
} from "@chakra-ui/react";

import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody";
import PlayBet from "./PlayBet";
import PreBetButton from "components/Input/PreBetButton";
import { useHistory } from "react-router-dom"
import { getPreBetData } from "action/PreBetActions";
import { useAblyPreBetUpdates } from 'hooks/useAblyPreBetUpdates'

import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';


export default function PlayPrebet(props) {
    const BET_ID = React.useMemo(() => {
        return props.betData?.betId || props.betId || null;
    }, [props.betData?.betId, props.betId]);

    const [animateKey, setAnimateKey] = useState(0);
    const [selectedData, setSeletedData] = useState({});
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo);
    const userAuthId = user?.userAuthId || user?._id?.toString();
    const level = props.level;

    const { preBetData, setPreBetData } = useAblyPreBetUpdates(BET_ID, level);

    var bet_number = Array.from({ length: 20 }, (_, i) => i + 1);

    useEffect(() => {
        const fetchSoldTickets = async () => {
            try {
                const data = await getPreBetData(BET_ID, props.level, history);
                if (data && data.length > 0) {
                    setPreBetData(data);
                }
            } catch (error) {
                console.error("Error fetching sold tickets:", error);
            }
        };
        if (userAuthId && BET_ID) {
            fetchSoldTickets();
        }
    }, [BET_ID, userAuthId]);

    useEffect(() => {
        if (props.betData) {
            setSeletedData({
                betId: props.betData.betId - (-1),
                level: props.betData.level,
                betStartTime: props.betData.betStartTime
            })
        }
    }, [props.betData]);

    function onSelect(value) {
        setSeletedData({
            betId: value,
            level: props.betData.level,
            betStartTime: props.betData.betStartTime
        })
    }

    return (
        <Grid templateColumns={{ md: '1fr', '2lg': '1fr 3fr' }} gap='18px' my='18px' >
            <Grid borderRight={{ '2lg': '1px solid #e2e8f0' }} borderBottom={{ md: '1px solid #e2e8f0', '2lg': 'none' }} pr="24px">
                <Card p="0" mt="18px">
                    <Card minH='83px' bg="none" border="2px solid white" mb="18px" maxW="400px" placeSelf="center">
                        <CardBody>
                            <Flex flexDirection='row' align='center' justify='center' w='100%'>
                                <CalendarMonthRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                                <Stat me='auto' textAlign="center">
                                    <StatLabel fontSize='sm' color='#00D4FF' fontWeight='normal' pb='2px'>
                                        Bet Calendar
                                    </StatLabel>
                                    <Flex justifyContent="center">
                                        <StatNumber fontSize='lg' color='#00D4FF' fontWeight='bold'>
                                            {BET_ID + 1} - {BET_ID + bet_number.length}
                                        </StatNumber>
                                    </Flex>
                                </Stat>
                            </Flex>
                        </CardBody>
                    </Card>
                    <Grid
                        width="100%"
                        templateColumns={{ sm: "repeat(6, 1fr)", md: "repeat(10, 1fr)", '2lg': "repeat(4, 1fr)" }}
                        pb="18px"
                        gap="18px"
                    >
                        {
                            bet_number.map((num_pre) => {
                                const targetBetId = num_pre + BET_ID;
                                const betDataArray = preBetData?.filter(t => Number(t.betId) === targetBetId) || [];

                                const totalSoldTickets = betDataArray.reduce((sum, bet) => sum + (bet.sellTicketCnt || 0), 0);
                                const remainingTickets = 100 - totalSoldTickets;

                                return (
                                    <PreBetButton
                                        key={`${num_pre}-${remainingTickets}`}
                                        label={targetBetId}
                                        ticket={remainingTickets}
                                        disabled={remainingTickets == 0}
                                        onClick={() => {
                                            setAnimateKey(prev => prev + 1),
                                                onSelect(targetBetId)
                                        }}
                                    />
                                );
                            })}
                    </Grid>
                </Card>
            </Grid>
            <SlideFade
                key={animateKey}
                in={true}
                offsetY="100px"
                transition={{
                    enter: {
                        duration: .5,
                        ease: "easeOut",
                    },
                    exit: {
                        duration: 0.5,
                        ease: "easeIn",
                    },
                }}
            >
                <PlayBet betData={selectedData} showRemainingTime={false} />
            </SlideFade>
        </Grid>
    )

}