import React from "react";
import { useSelector } from "react-redux";

import {
    Flex,
    SimpleGrid,
    Stat,
    Text,
    StatLabel,
    StatNumber,
} from "@chakra-ui/react";


import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import truncateToTwo from "variables/truncateToTwo";

import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import AddCardRoundedIcon from '@mui/icons-material/AddCardRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';

function Overview() {
    const user = useSelector((state) => state.user?.userInfo) || {};

    let totalPartnerEarning = 0;
    // user.partnerEarnHistory.map((item, index) => {
    //     totalPartnerEarning += item.earnAmt;
    // })

    user.partnerEarnHistory && user.partnerEarnHistory.forEach(element => {
        totalPartnerEarning += 100*element.earnAmt;
    });

    return (
        <SimpleGrid columns={{ sm: 1, md:2, lg: 3 }} spacing='24px' my='26px' >
            <Card height="90px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat me='auto'>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Total Invite Users
                            </StatLabel>
                            <Flex>
                                <StatNumber fontSize='lg' color='#fff'>
                                    {user.userId ? user.inviteUserCnt : '0'}
                                </StatNumber>
                            </Flex>
                        </Stat>
                        <Diversity3RoundedIcon style={{ fontSize: "46px", color: "#00D4FF"}} />
                        {/* <NeonBadge
                            src={users}
                            size="70px"
                            delay="0s"
                            neonColor="#ff9700"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
            <Card minH='83px' height="90px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat me='auto'>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Current Earning
                            </StatLabel>
                            <Flex>
                                <Text fontSize="lg" color="#00D4FF"
                                    style={{
                                        marginLeft: "0px",marginRight: "5px",
                                    
                                    }} fontWeight="bold" m="auto">
                                    $
                                </Text>
                                <StatNumber fontSize='lg' color='#fff'>
                                    {user.userId ? truncateToTwo(user.partnerEarn) : '0'}
                                </StatNumber>
                            </Flex>
                        </Stat>
                        <AddCardRoundedIcon style={{ fontSize: "46px", color: "#00D4FF"}} />
                        {/* <button className="star-button">⭐Deposit</button> */}
                        {/* <NeonBadge
                            src={currentEarning}
                            size="70px"
                            delay="0s"
                            neonColor="#029afd"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
            <Card height="90px">
                <CardBody>
                    <Flex flexDirection='row' align='center' justify='center' w='100%'>
                        <Stat>
                            <StatLabel fontSize='sm' color='#00D4FF' fontWeight='bold' pb='2px'>
                                Total Patner Earning
                            </StatLabel>
                            <Flex align='center'>
                                <Text fontSize="lg" color="#00D4FF"
                                    style={{
                                        marginLeft: "0px",marginRight: "5px",
                                       
                                    }} fontWeight="bold" m="auto">
                                    $
                                </Text>
                                <StatNumber fontSize='lg' color='#fff'>
                                    {truncateToTwo(totalPartnerEarning/100)}
                                </StatNumber>
                            </Flex>
                        </Stat>
                        <CardGiftcardRoundedIcon style={{ fontSize: "46px", color: "#00D4FF"}} />
                        {/* <NeonBadge
                            src={totalEarning}
                            size="70px"
                            delay="0s"
                            neonColor="#ec9700"
                        /> */}
                    </Flex>
                </CardBody>
            </Card>
        </SimpleGrid>
    );
}

export default Overview;