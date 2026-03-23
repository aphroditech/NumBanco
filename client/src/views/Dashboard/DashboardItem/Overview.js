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


function Overview() {
    const remainingMs = useSelector((state) => state.user.lootRemainingMs);
    const lootAvailable = useSelector((state) => state.user.lootAvailable);
    const user = useSelector((state) => state.user?.userInfo) || {};

    const activeUsers = useSelector((state) => state.user.activeUsers);

    const [totalActiveUsers, setTotalActiveUsers] = useState([]);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                const tempUsers = await fetchTotalActiveUsers();
                if (isMounted) {
                    setTotalActiveUsers(tempUsers);
                }
            } catch (err) {
                console.log(err);
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
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
                                    Bet Level
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
                                        {activeUsers?.onlineUsers == 0 ? totalActiveUsers.onlineUsers : activeUsers?.onlineUsers}
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
                            <CloudDownloadRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
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
                                    Partner Earning
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
                            <CloudUploadRoundedIcon style={{ fontSize: "46px", color: "#00D4FF" }} />
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
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "2px", marginRight: "0px",

                                        }} fontWeight="bold" m="auto">
                                        {user.maxWithdraw == -1 ? "" : "/"}
                                    </Text>
                                    <Text fontSize="lg" color="#00D4FF"
                                        style={{
                                            marginLeft: "2px", marginRight: "2px",

                                        }} fontWeight="bold" m="auto">
                                        {user.maxWithdraw == -1 ? "" : "$"}
                                    </Text>
                                    <StatNumber fontSize='lg' color='#fff' fontWeight='bold'>
                                        {user.maxWithdraw == -1 ? "" : user.maxWithdraw}
                                    </StatNumber>
                                </Flex>
                                {user.maxWithdraw == -1 ?
                                    ''
                                    :
                                    <Progress
                                        bg="#323738"
                                        borderRadius="30px"
                                        h="5px"
                                        value={user.dailyWithdraw / user.maxWithdraw * 100}
                                        mt="2px"
                                        mr="10px"
                                        sx={{
                                            "& > div": { background: "#00D4FF" }
                                        }}
                                    />
                                }
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