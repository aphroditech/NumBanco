import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
    Flex,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    Grid,
    Text,
    Progress
} from "@chakra-ui/react";

import NeonBadge from 'components/NeonBadge'

import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import truncateToTwo from "variables/truncateToTwo";

import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';

import DiamondIcon from '@mui/icons-material/Diamond';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { totalActiveUsers as fetchTotalActiveUsers } from "action/BetActions";
import { formatTime } from "components/functions/format";
import HandshakeIcon from '@mui/icons-material/Handshake';
import TodayIcon from '@mui/icons-material/Today';

function Overview() {
    const remainingMs = useSelector((state) => state.user.lootRemainingMs);
    const lootAvailable = useSelector((state) => state.user.lootAvailable);
    const user = useSelector((state) => state.user?.userInfo) || {};

    const activeUsers = useSelector((state) => state.user.activeUsers);

    const [displayUsers, setDisplayUsers] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                const tempUsers = await fetchTotalActiveUsers();
            } catch (err) {
                console.log(err);
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Demo/visual: show Users value cycling between 0 and 10 every 2 seconds.
    useEffect(() => {
        const id = setInterval(() => {
            setDisplayUsers((prev) => {
                let delta = Math.random() < 0.5 ? -1 : 1;
                if (prev <= 0) delta = 1;
                if (prev >= 10) delta = -1;
                return prev + delta;
            });
        }, 2000);
        return () => clearInterval(id);
    }, []);

    return (
        <Grid>
            <SimpleGrid columns={{ sm: 2, md: 3, lg: 3, xl: 3, '1625px': 6, '2xl': 6 }} spacing='24px' mb="20px" >
                {/* MiniStatistics Card */}
                <Card key="membership" pt="17px" pb="10px" height="85px" >
                    <CardBody >
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <Stat me='auto'>
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                    Medal
                                </StatLabel>
                                <Flex>
                                    <StatNumber fontSize='lg' color='#fff'>
                                        {!user.membership && "FREE"}
                                        {user.membership == 1 && "PLUS"}
                                        {user.membership == 2 && "PRO"}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                            {!user.membership &&
                                <RocketLaunchIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                                // <NeonBadge
                                //     src={membershipFree}
                                //     size="70px"
                                //     delay="0s"
                                //     neonColor="#f7941d"
                                // /> 
                            }
                            {user.membership == 1 &&
                                <WorkspacePremiumIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                                // <NeonBadge
                                //     src={membershipPlus}
                                //     size="70px"
                                //     delay="0s"
                                //     neonColor="#a5111b"
                                // /> 
                            }
                            {user.membership == 2 &&
                                <EmojiEventsIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                                // <NeonBadge
                                //     src={membershipPro}
                                //     size="70px"
                                //     delay="0s"
                                //     neonColor="#be6f2d"
                                // /> 
                            }
                        </Flex>
                    </CardBody>
                </Card>
                <Card key="users" pt="17px" pb="10px" height="85px">
                    <CardBody >
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <Stat>
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                    Users
                                </StatLabel>
                                <Flex>
                                    <StatNumber fontSize='lg' color='#fff'>
                                    {(activeUsers?.totalActiveUsers || 0) + displayUsers}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                            <GroupsRoundedIcon style={{ fontSize: "46px", color: "#00D4FF", marginRight: "8px" }} />
                            {/* <NeonBadge
                                src={users}
                                size="70px"
                                delay="0s"
                                neonColor="#ff9700"
                            /> */}
                        </Flex>
                    </CardBody>
                </Card>
                <Card key="reward" pt="17px" pb="10px" height="85px">
                    <CardBody >
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <Stat>
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                    Reward
                                </StatLabel>
                                <Flex>
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "0px", marginRight: "5px",

                                        }} fontWeight="bold" m="auto">
                                        $
                                    </Text>
                                    <StatNumber fontSize='lg' color='#fff'>
                                        {user.userId ? truncateToTwo(user.refreshBet * 0.02) : 0}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                            <CurrencyExchangeIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                            {/* <NeonBadge
                                src={reward}
                                size="70px"
                                delay="0s"
                                neonColor="#ae1728"
                            /> */}
                        </Flex>
                    </CardBody>
                </Card>
                <Card key="withdraw" pt="17px" pb="10px" height="85px">
                    <CardBody >
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <Stat>
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                    Daily Loot
                                </StatLabel>
                                <Flex>
                                    <StatNumber fontSize='lg' color='#fff'>
                                        {lootAvailable ? "Can get now!" : formatTime(remainingMs)}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                            <TodayIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                            {/* <NeonBadge
                                src={withdraw}
                                size="70px"
                                delay="0s"
                                neonColor="#d5a20a"
                            /> */}
                            {/* <Avatar  src={withdraw} bg="transparent"  w="70px" h="70px"  /> */}
                        </Flex>
                    </CardBody>
                </Card>
                <Card key="deposit" minH='83px' pt="17px" pb="10px" height="85px">
                    <CardBody  >
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <Stat me='auto'>
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                    Affiliation
                                </StatLabel>
                                <Flex>
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "0px", marginRight: "5px",

                                        }} fontWeight="bold" m="auto">
                                        $
                                    </Text>
                                    <StatNumber fontSize='lg' color='#fff'>
                                        {truncateToTwo(user.partnerEarn) || !user.partnerEarn && 0}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                            <HandshakeIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                            {/* <NeonBadge
                                src={deposit}
                                size="70px"
                                delay="0s"
                                neonColor="#318fc3"
                            /> */}
                        </Flex>
                    </CardBody>
                </Card>
                <Card key="daily-withdraw" pt="17px" pb="10px" height="85px">
                    <CardBody >
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <Stat me='auto'>
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                    Daily Withdraw
                                </StatLabel>
                                <Flex>
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "0px", marginRight: "2px",

                                        }} fontWeight="bold" m="auto">
                                        $
                                    </Text>
                                    <StatNumber fontSize='lg' color='#fff' fontWeight='bold'>
                                        {user.dailyWithdraw || !user.dailyWithdraw && 0}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                            <LocalFireDepartmentIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
                            {/* <NeonBadge
                                src={daily}
                                size="70px"
                                delay="0s"
                                neonColor="#dfb7da"
                            /> */}
                        </Flex>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Grid>
    );
}

export default Overview;