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

function AToZRealViewRow(props) {
    const { userName, avatar, result, winAmount } = props;
    const winColor = winAmount > 0 ? "#6DC64B" : "#E74C3C";
    const displayName = userName;

    return (
        <Tr>
            <Td
                textAlign="center"
                px="0px"
                py="4px"
                h="16px"
                border="none"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
            >
                <Flex justify="space-between" align="center">
                    <HStack spacing="8px">
                        {avatar ? (
                            <Box
                                w="22px"
                                h="22px"
                                borderRadius="50%"
                                backgroundImage={`url(${avatar})`}
                                backgroundSize="cover"
                                backgroundPosition="center"
                            />
                        ) : (
                            <Box w="24px" h="24px" borderRadius="50%" bg="rgba(231, 76, 60, 0.3)" />
                        )}
                        <Tooltip label={userName || ""} placement="top" hasArrow>
                            <Text color={winColor} fontSize="xs">
                                {displayName}
                            </Text>
                        </Tooltip>
                    </HStack>
                </Flex>
            </Td>
            <Td
                textAlign="left"
                py="4px"
                h="16px"
                border="none"
                overflow="visible"
            >
                <Text fontSize="xs" color={winColor} fontWeight="normal" textAlign="center" whiteSpace="nowrap">
                    {result}x
                </Text>
            </Td>
            <Td
                textAlign="left"
                py="4px"
                h="16px"
                border="none"
                overflow="visible"
            >
                <Text fontSize="xs" color={winColor} fontWeight="normal" textAlign="center" whiteSpace="nowrap">
                    ${truncateToTwo(winAmount)}
                </Text>
            </Td>
        </Tr>
    );
}

export default AToZRealViewRow;