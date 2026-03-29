import {
  Flex,
  Td,
  Text,
  Tooltip,
  Tr,
  Box,
  HStack,
} from "@chakra-ui/react";
import React from "react";

import truncateToTwo from "variables/truncateToTwo";
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

function KenoRealViewRow(props) {
  const { altas, avatar, bet, win } = props;
  const isWin = win > 0;
  const rowColor = isWin ? "#68d391" : "#f56565";
  const displayName = altas || "—";

  return (
    <Tr className={props.isNew ? "realtime-new" : undefined} borderBottom="1px solid rgba(255,255,255,0.06)" _last={{ borderBottom: "none" }}>
      <Td
        textAlign="left"
        px="0px"
        py="6px"
        h="auto"
        border="none"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        <Flex align="center">
          <HStack spacing="8px">
            {avatar ? (
              <Box
                w="22px"
                h="22px"
                borderRadius="50%"
                backgroundImage={`url(${avatar})`}
                backgroundSize="cover"
                backgroundPosition="center"
                flexShrink={0}
              />
            ) : (
              <Box w="22px" h="22px" borderRadius="50%" bg="rgba(0, 212, 255, 0.2)" flexShrink={0} />
            )}
            <Tooltip label={altas || ""} placement="top" hasArrow>
              <Text color={rowColor} fontSize="13px" fontWeight="700">
                {displayName}
              </Text>
            </Tooltip>
          </HStack>
        </Flex>
      </Td>
      <Td
        textAlign="center"
        py="6px"
        h="auto"
        border="none"
        overflow="visible"
      >
        <Text fontSize="13px" color={rowColor} fontWeight="700" textAlign="center" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {bet}
        </Text>
      </Td>
      <Td
        textAlign="right"
        py="6px"
        h="auto"
        border="none"
        overflow="visible"
      >
        <Text fontSize="13px" color={rowColor} fontWeight="700" textAlign="right" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {truncateToTwo(win)}
        </Text>
      </Td>
    </Tr>
  );
}

export default KenoRealViewRow;