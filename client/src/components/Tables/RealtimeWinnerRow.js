import {
  Avatar,
  Badge,
  Box,
  Flex,
  Td,
  Text,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import React, { useState, useEffect, useRef } from "react";

import truncateToTwo from "variables/truncateToTwo";
import proring from "assets/badge/GOLDEN_CIRCLE.png"
import plusring from "assets/badge/BLUE_CIRCLE.png"

// Add CSS animations for neon effects
const neonStyles = `
  @keyframes golden-pulse {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }
  
  @keyframes cyan-pulse {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }
  @keyframes row-slide-in {
    0% {
      transform: translateX(36px);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  tr.realtime-new td {
    animation: row-slide-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('realtime-winner-styles');
  if (existingStyle) {
    existingStyle.textContent = neonStyles;
  } else {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'realtime-winner-styles';
    styleSheet.textContent = neonStyles;
    document.head.appendChild(styleSheet);
  }
}

function RealtimeWinnerRow(props) {
  const [displayTime, setDisplayTime] = useState(0);    
  const [isNameTruncated, setIsNameTruncated] = useState(false);
  const nameRef = useRef(null);
  const {
    avatar,
    altas,
    earn,
    level,
    time,
    lastItem,
    membership,
    now
  } = props;


  useEffect(() => {
    let startTime = now-time;
    if(startTime) {
      const interval = setInterval(() => {
        startTime += 100;
        setDisplayTime(startTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [now])

  useEffect(() => {
    if (!nameRef.current) return;
    const el = nameRef.current;
    setIsNameTruncated(el.scrollWidth > el.clientWidth);
  }, [altas]);
  
  return (
    <Tr className={props.isNew ? "realtime-new" : undefined}>
      <Td
      textAlign="center"
      ps='0px'
      border={lastItem ? "none" : null}
      borderBottomColor='#56577A'
      overflow="hidden"
      textOverflow="ellipsis"
      whiteSpace="nowrap">
        <Flex align='center' flexWrap='nowrap' minW="0">
          <Box position="relative" display="inline-block" ml="7px" me="5px" w="30px" h="30px" flexShrink={0}>
            <Box
              w="30px"
              h="30px"
              borderRadius="full"
              backgroundImage={`url(${avatar})`}
              backgroundSize="cover"
            />
            <Box
              position="absolute"
              top="-2.5px"
              left="-3px"
              w="37px"
              h="37px"
              backgroundImage={`url(${membership === 2 && proring || membership === 1 && plusring})`}
              backgroundSize="contain"
              backgroundRepeat="no-repeat"
              backgroundPosition="center"
              zIndex="6"
            />
          </Box>
          <Flex direction='column' minW="0" flex="1">
            <Tooltip
              label={altas || ""}
              placement="top"
              hasArrow
              isDisabled={!isNameTruncated}
            >
              <Text
                ref={nameRef}
                fontSize='sm'
                color='#fff'
                fontWeight='normal'
                isTruncated>
                {altas}
              </Text>
            </Tooltip>
          </Flex>
        </Flex>
      </Td>

      

      <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor='#56577A' overflow="hidden">
        <Badge 
          variant="solid"
          colorScheme={
            level === 0 
              ? 'gray'
              : level === 1 
              ? 'cyan' 
              : 'yellow'
          }
        >
          {level == 0 ? "TierA" : level == 1 ? "TierB" : "TierC"}
        </Badge>
      </Td>
      <Td
      textAlign="left"
      border={lastItem ? "none" : null}
      borderBottomColor='#56577A'
      overflow="hidden"
      >
        <Flex direction='column'>
          <Text fontSize='sm' color='#fff' fontWeight='normal' isTruncated>
            ${truncateToTwo(earn)}
          </Text>
        </Flex>
      </Td>
      <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor='#56577A' overflow="hidden">
        <Text fontSize='sm' color='#fff' fontWeight='normal' isTruncated>
          {Math.floor(displayTime/1000)} s 
        </Text>
      </Td>
    </Tr>
  );
}

export default RealtimeWinnerRow;
