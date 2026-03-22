import React from "react";
import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";

export default function CloudSpreadBetHistory({ results = [] }) {
  return (
    <Box mt="18px">
      <Card p="12px">
        <CardBody>
          <Text color="white" fontWeight="800" mb="10px">
            Cloud Spread Bet History
          </Text>
          <Table variant="unstyled" color="white">
            <Thead>
              <Tr>
                <Th color="white">Round</Th>
                <Th color="white">Step</Th>
                <Th color="white">Multiplier</Th>
                <Th color="white">Bet</Th>
                <Th color="white">Win</Th>
                <Th color="white">Time</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(results || []).map((row) => (
                <Tr key={row._id}>
                  <Td>{row.roundId}</Td>
                  <Td>{row.targetStep}</Td>
                  <Td>x{Number(row.targetMultiplier || 1).toFixed(2)}</Td>
                  <Td>$ {Number(row.betAmount || 0).toFixed(2)}</Td>
                  <Td color={Number(row.winAmount || 0) > 0 ? "#68d391" : "#fc8181"}>
                    $ {Number(row.winAmount || 0).toFixed(2)}
                  </Td>
                  <Td>{new Date(row.createdAt).toLocaleString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
}
