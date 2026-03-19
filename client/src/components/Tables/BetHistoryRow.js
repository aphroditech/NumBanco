import { Flex, Text, Box, Grid, useColorModeValue } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";

import WinOne from "./BetHistory/winOne";
import WinTwo from "./BetHistory/winTwo";
import WinThree from "./BetHistory/winThree";
import WinFour from "./BetHistory/winFour";
import WinFive from "./BetHistory/winFive";
import WinSix from "./BetHistory/winSix";

import firstplace from "assets/badge/place/1.png";
import secondplace from "assets/badge/place/2.png";
import thirdplace from "assets/badge/place/3.png";
import fourthplace from "assets/badge/place/4.png";
import fifthplace from "assets/badge/place/5.png";
import sixthplace from "assets/badge/place/6.png";
import { useSelector } from "react-redux";
import wolfnoavilable from 'assets/img/wolfnoavilable.png';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';

import { getWinResult } from "components/functions/getWinResult";

function BetHistoryRow(props) {
    const {
        betFour,
        betFive,
        betSix,
    } = props.value?.BetResults?.betResult || {};


    const {
        first,
        second,
        third
    } = props.value?.winners || [];
    // return Array.isArray(res.data) ? res.data : [];

    if (!props.value?.BetResults) {
        return <Text color="white">Loading...</Text>;
    }

    const { type } = props;
    const user = useSelector((state) => state.user.userInfo);

    if (type === "my") {
        const { isWinner, prizes } = getWinResult(
            props.value?.BetResults.betResult,
            user.userId
        );
        return !isWinner ? (
            <Flex
                flex="1"
                minW={{ xl: 600, md: 400 }}
                minH="420px"
                direction="column"
                align="center"
                justifyContent="center"
                textAlign="center"
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

                <Flex align="center" justify="center" mb="8px">
                    <SpeakerNotesOffRoundedIcon
                        sx={{
                            fontSize: 22,
                            mr: 1,
                            filter: "drop-shadow(0 0 8px white)",
                        }}
                    />
                    <Text fontSize="lg" fontWeight="600">
                        No wins this round
                    </Text>
                </Flex>

                <Text fontSize="sm" opacity={0.7}>
                    Better luck next time
                </Text>
            </Flex>
        ) : (
            <Flex display="block">
                {prizes.includes("1st") && <WinOne logo={firstplace} value={first} />}
                {prizes.includes("2nd") && <WinTwo logo={secondplace} value={second} />}
                {prizes.includes("3rd") && <WinThree logo={thirdplace} value={third} />}
                {prizes.includes("4th") && <WinFour logo={fourthplace} value={betFour} />}
                {prizes.includes("5th") && <WinFive logo={fifthplace} value={betFive} />}
                {prizes.includes("6th") && <WinSix logo={sixthplace} value={betSix} />}
            </Flex>
        );
    }


    return (
        <Flex display="block">
            <WinOne logo={firstplace} value={first} />
            <WinTwo logo={secondplace} value={second} />
            <WinThree logo={thirdplace} value={third} />
            <WinFour logo={fourthplace} value={betFour} />
            <WinFive logo={fifthplace} value={betFive} />
            <WinSix logo={sixthplace} value={betSix} />
        </Flex>
    );
}

export default BetHistoryRow;