import React, { useEffect, useState } from "react";

import {
    Flex,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Text
} from "@chakra-ui/react";
import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
const remainingTimeStr = [
    "betAStartTime", "betBStartTime", "betCStartTime"
]

import { useAblyTicketUpdates } from 'hooks/useAblyTicketUpdates'
import { getSoldTickets } from "action/BetActions";
import { onlineUser, offlineUser } from "action/BetActions";
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded';
import BakeryDiningRoundedIcon from '@mui/icons-material/BakeryDiningRounded';
import StyleRoundedIcon from '@mui/icons-material/StyleRounded';
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

function Overview(props) {

    const [remainingTicket, setRemainingTicket] = useState(100);
    const user = useSelector((state) => state.user?.userInfo) || {};
    const activeUsers = useSelector((state) => state.user.activeUsers);
    // Guard against null/undefined betData during initial render
    const safeBetId = props.betData?.betId;
    const safeLevel = props.level;
    const { soldTickets, setSoldTickets } = useAblyTicketUpdates(user?.userAuthId, safeBetId, safeLevel);
    const [currentBetId, setCurrentBetId] = useState();
    const [remainingTime, setRemainingTime] = useState();
    const activeUser = [
        "tierAUsers", "tierBUsers", "tierCUsers"
    ]
    const history = useHistory();

    useEffect(() => {
        if (!props.betData || props.level == null) return;

        const key = remainingTimeStr[props.level];
        let startTime = sessionStorage.getItem(key);
        if (!startTime) {
            startTime = Date.now() - props.betData.differenceTime;
            sessionStorage.setItem(key, startTime);
        } else {
            startTime = Number(startTime);
        }
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 30000 - elapsed);
            setRemainingTime(remaining);
            if (remaining === 0) {
                clearInterval(interval);
                // sessionStorage.removeItem(key);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [props.betData, props.level]);

    useEffect(() => {
        if (props.level == null) return;

        onlineUser(props.level);
        return () => {
            offlineUser(props.level);
        };
    }, [props.level]);

    useEffect(() => {
        setSoldTickets([]);
    }, [props.betData]);

    useEffect(() => {
        if (!props.betData || safeLevel == null) return;

        const fetchSoldTickets = async () => {
            try {
                if (!user) return;
                const data = await getSoldTickets({ betId: safeBetId, level: safeLevel }, history);

                if (data?.soldTickets) {
                    setSoldTickets(data.soldTickets.map(Number));
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchSoldTickets();
    }, [props.betData, user, setSoldTickets, safeBetId, safeLevel]);


    useEffect(() => {
        if (!props.betData) return;

        setCurrentBetId(props.betData.betId);
        const sellTicketCnt = props.betData.betData?.sellTicketCnt;
        if (sellTicketCnt != null) {
            setRemainingTicket(100 - sellTicketCnt);
        }
    }, [props.betData])

    useEffect(() => {
        soldTickets && setRemainingTicket(100 - soldTickets.length)
    }, [soldTickets])

    return (
        <SimpleGrid columns={{ sm: 2, md: 3, lg: 4, '2xl': 6 }} spacing='24px' my='26px'>
            <Card height='85px' pt="17px" pb="10px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat me='auto'>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Active User
                            </StatLabel>
                            <Flex>
                                <StatNumber fontSize='lg' color='#fff'>
                                    {activeUsers[activeUser[props.level]] || 0}
                                </StatNumber>
                            </Flex>
                        </Stat>
                        <PeopleAltRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                        {/* <NeonBadge
                            src={users}
                            size="70px"
                            delay="0s"
                            neonColor="#ff9700"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
            {/* MiniStatistics Card */}
            <Card height='85px' pt="17px" pb="10px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat me='auto'>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Current Bet ID
                            </StatLabel>
                            <Flex>
                                <StatNumber fontSize='lg' color='#fff'>
                                    {currentBetId}
                                </StatNumber>
                            </Flex>
                        </Stat>
                        <BakeryDiningRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                        {/* <NeonBadge
                        src={id}
                        size="55px"
                        delay="0s"
                        mt="10px"
                        neonColor="#ff3355"
                    /> */}
                    </Flex>
                </CardBody>
            </Card>
            {/* MiniStatistics Card */}
            <Card height='85px' pt="17px" pb="10px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Remaining Time
                            </StatLabel>
                            <Flex>
                                <div style={{ position: 'relative', display: 'inline-block', minWidth: '60px' }}>
                                    <StatNumber fontSize='lg' color='#fff' style={{ display: 'inline-block', width: '40px', textAlign: 'left' }}>
                                        {(remainingTime / 1000).toFixed(1)}
                                    </StatNumber>
                                    <Text
                                        fontSize="lg"
                                        color="#00D4FF"
                                        style={{
                                            position: 'absolute',
                                            left: '40px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',

                                        }}
                                        fontWeight="bold"
                                    >
                                        s
                                    </Text>
                                </div>
                            </Flex>
                        </Stat>
                        <AlarmRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                        {/* <NeonBadge
                            src={clock}
                            size="70px"
                            delay="0s"
                            neonColor="#ff1a1a"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
            {/* MiniStatistics Card */}
            <Card height='85px' pt="17px" pb="10px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat me='auto'>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Remainning Ticket
                            </StatLabel>
                            <Flex>
                                <StatNumber fontSize='lg' color='#fff' fontWeight='bold'>
                                    {remainingTicket}
                                </StatNumber>
                                <Text fontSize="lg" color="#00D4FF"
                                    style={{
                                        marginLeft: "5px", marginRight: "5px",

                                    }} fontWeight="bold" m="auto">
                                    /
                                </Text>
                                <StatNumber fontSize='lg' color='#fff' fontWeight='bold'>
                                    100
                                </StatNumber>
                            </Flex>
                        </Stat>
                        <StyleRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                        {/* <NeonBadge
                            src={ticket}
                            size="70px"
                            delay="0s"
                            neonColor="#ff1a1a"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
            <Card height='85px' pt="17px" pb="10px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Bet Price
                            </StatLabel>
                            <Flex>

                                <Text fontSize="lg" color="#00D4FF"
                                    style={{
                                        marginLeft: "5px", marginRight: "5px",

                                    }} fontWeight="bold" m="auto">
                                    $
                                </Text>
                                {props.level == 0 && (
                                    <StatNumber fontSize='lg' color='#fff'>
                                        1
                                    </StatNumber>
                                )}

                                {props.level == 1 && (
                                    <StatNumber fontSize='lg' color='#fff'>
                                        5
                                    </StatNumber>
                                )}

                                {props.level == 2 && (
                                    <StatNumber fontSize='lg' color='#fff'>
                                        50
                                    </StatNumber>
                                )}

                            </Flex>
                        </Stat>
                        <LocalAtmRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                        {/* <NeonBadge
                            src={Price}
                            size="70px"
                            delay="0s"
                            neonColor="#029afd"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
            <Card height='85px' pt="17px" pb="10px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Bet Level
                            </StatLabel>
                            <Flex>
                                <StatNumber fontSize='lg' color='#fff'>
                                    Tier
                                </StatNumber>
                                {props.level == 0 && (
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "5px",

                                        }} fontWeight="bold" m="auto">
                                        A
                                    </Text>
                                )}
                                {props.level == 1 && (
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "5px",

                                        }} fontWeight="bold" m="auto">
                                        B
                                    </Text>
                                )}
                                {props.level == 2 && (
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "5px",

                                        }} fontWeight="bold" m="auto">
                                        C
                                    </Text>
                                )}
                            </Flex>
                        </Stat>
                        {props.level == 0 ?
                            // <NeonBadge
                            //     src={tierA}
                            //     size="70px"
                            //     delay="0s"
                            // />
                            <RocketLaunchIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                            : (props.level == 1 ?
                                // <NeonBadge
                                //     src={tierB}
                                //     size="70px"
                                //     delay="0s"
                                // />
                                <WorkspacePremiumIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                                :
                                // <NeonBadge
                                //     src={tierC}
                                //     size="70px"
                                //     delay="0s"
                                // />
                                <EmojiEventsIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                            )}
                    </Flex>
                </CardBody>
            </Card>
        </SimpleGrid>
    );
}

export default Overview;