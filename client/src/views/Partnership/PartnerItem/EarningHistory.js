import React, { useEffect } from 'react';

import {
    Text,
    Flex,
    Box,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader.js';
import CardBody from 'components/Card/CardBody';

// import { earningHistoryData } from 'variables/general';
import EarningHistoryRow from "components/Tables/EarningHistoryRow";
import { useSelector } from 'react-redux';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import wolfnoavilable from '../../../assets/img/wolfnoavilable.png';

export default function PartnerEarningHistory() {
    // const [earnHistory, setEarnHistory] = React.useState([]);

    // useEffect(() => {

    // }, []);
    const earnHistory = useSelector((state) => state.user.userInfo.partnerEarnHistory);

    return (

        <Card p="16px">
            <CardHeader mb="20px">
                <Flex direction="column" alignSelf="flex-start">
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                        <RestoreRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Earning History
                    </Text>
                </Flex>
            </CardHeader>

            <CardBody>
                <Flex
                    direction="column"
                    w="100%"
                    maxH="260px"    // Adjust height for ~5 rows
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
                            background: "#2a3a6f",
                        },
                    }}
                >
                    {earnHistory?.length ? (
                        earnHistory.slice().reverse().map((row, index) => (
                            <EarningHistoryRow
                                key={index}
                                date={row.date}
                                amounts={row.earnAmt}
                            />
                        ))
                    ) : (
                        <Flex
                            flex="1"
                            direction="column"
                            align="center"
                            justify="center"
                            minH="200px"
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
                            <Flex align="center" justify="center" mt="0px" mb="20px">
                                <SpeakerNotesOffRoundedIcon
                                    style={{
                                        fontSize: "20px",
                                        color: "white",
                                        marginRight: "8px",

                                    }} />
                                No earning found
                            </Flex>
                        </Flex>
                    )}
                </Flex>
            </CardBody>
        </Card>
    );
}
