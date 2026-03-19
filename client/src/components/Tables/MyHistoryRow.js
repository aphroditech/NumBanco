import React from "react";
import { Flex, Text } from "@chakra-ui/react";

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

function MyHistoryRow({ value, level }) {
  if (!value?.BetResults?.betResult) {
    return <Text color="white">Loading...</Text>;
  }

  const {
    // betOne,
    // betTwo,
    // betThree,
    betFour,
    betFive,
    betSix,
  } = value.BetResults.betResult;

  const {
    first,
    second,
    third
  } = value.winners || [];


  /* ----------------------------------
     PRICES BASED ON LEVEL
  ---------------------------------- */
  const priceMap = {
    0: [16, 8, 4, 2, 1, 0.1],
    1: ['80 + 10', 40, 20, 10, 5, 0.5],
    2: ['800 + 150', 400, 200, 100, 50, 5],
  };

  const prices = priceMap[level] || priceMap[0];

  return (
    <Flex direction="column">
      <WinOne logo={firstplace} value={first} price={prices[0]} />
      <WinTwo logo={secondplace} value={second} price={prices[1]} />
      <WinThree logo={thirdplace} value={third} price={prices[2]} />
      <WinFour logo={fourthplace} value={betFour} price={prices[3]} />
      <WinFive logo={fifthplace} value={betFive} price={prices[4]} />
      <WinSix logo={sixthplace} value={betSix} price={prices[5]} />
    </Flex>
  );
}

export default MyHistoryRow;