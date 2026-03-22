import { Td, Text, Tr } from "@chakra-ui/react";
import React from "react";

import truncateToTwo from "variables/truncateToTwo";

function AlphaTreeHistoryRow(props) {
    const { No, bet, totalMultiplier, profit, time, lastItem } = props;
    const winColor = profit > 0 ? "#6DC64B" : "#E74C3C";

    return (
        <Tr>
            <Td
                textAlign="center"
                border={lastItem ? "none" : null}
                borderBottomColor="#56577A"
            >
                <Text fontSize="sm" color="#fff" fontWeight="normal">
                    {No}
                </Text>
            </Td>
            <Td
                textAlign="center"
                border={lastItem ? "none" : null}
                borderBottomColor="#56577A"
            >
                <Text fontSize="sm" color="#fff" fontWeight="normal">
                    {truncateToTwo(bet)}
                </Text>
            </Td>
            <Td
                textAlign="center"
                border={lastItem ? "none" : null}
                borderBottomColor="#56577A"
            >
                <Text fontSize="sm" color="#FFD700" fontWeight="normal">
                    {truncateToTwo(totalMultiplier)}
                </Text>
            </Td>
            <Td
                textAlign="center"
                border={lastItem ? "none" : null}
                borderBottomColor="#56577A"
            >
                <Text fontSize="sm" color={winColor} fontWeight="normal">
                    {truncateToTwo(profit)}
                </Text>
            </Td>
            <Td
                textAlign="center"
                border={lastItem ? "none" : null}
                borderBottomColor="#56577A"
            >
                <Text fontSize="sm" color="#fff" fontWeight="normal">
                    {time ? new Date(time).toLocaleString() : "—"}
                </Text>
            </Td>
        </Tr>
    );
}

export default AlphaTreeHistoryRow;
