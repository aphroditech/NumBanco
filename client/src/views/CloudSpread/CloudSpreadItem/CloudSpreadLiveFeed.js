import React, { useMemo } from "react";
import { Avatar, Box, Flex, HStack, Text, Tooltip } from "@chakra-ui/react";

function truncateName(s, maxLen = 9) {
  if (s == null || s === "") return "—";
  const t = String(s);
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

/**
 * Narrow vertical feed (crash-style): USER · BET($) · WIN($).
 * Height follows the grid cell on xl (list scrolls inside). Below xl: no inner scroll — panel grows with rows.
 * Win &gt; 0 → green row; win === 0 → red (same as CloudSpreadBetHistory / other games).
 */
export default function CloudSpreadLiveFeed({ rows = [], title = "Live", maxRows = 18 }) {
  const list = useMemo(() => (Array.isArray(rows) ? rows : []).slice(0, maxRows), [rows, maxRows]);

  return (
    <Box
      w="100%"
      maxW="100%"
      /** match left column height + inner scroll. Responsive: natural height, no scrollbar. */
      h="100%"
      minH={0}
      flex={1}
      bg="#2b2b2b"
      borderRadius="14px"
      border="1px solid rgba(255,255,255,0.1)"
      boxShadow="none"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      p="12px"
      pt="16px"
    >
      <Flex align="center" justify="space-between" mb="6px" px="10px">
        <Text fontSize="sm" fontWeight="800" color="rgba(255,255,255,0.92)" letterSpacing="0.02em">
          {title}
        </Text>
      </Flex>
      <Flex
        px="10px"
        pb="4px"
        borderBottom="1px solid rgba(255,255,255,0.12)"
        fontSize="10px"
        fontWeight="800"
        color="rgba(255,255,255,0.9)"
        textTransform="uppercase"
        letterSpacing="0.06em"
      >
        <Text flex="1.15">USER</Text>
        <Text flex="0.85" textAlign="center">
          Bet($)
        </Text>
        <Text flex="0.85" textAlign="right" pr="2px">
          Win($)
        </Text>
      </Flex>
      <Box
          flex="1"
          minH="0"
          overflowX="hidden"
          width="100%"
          overflowY="auto"
          px="10px"
          pb="6px"
         sx={{
           "&::-webkit-scrollbar": { display: "none" },
           "msOverflowStyle": "none",
           "scrollbarWidth": "none",
         }}
       >
        {list.length === 0 ? (
          <Text color="rgba(255,255,255,0.38)" fontSize="sm" py="10" textAlign="center" fontWeight="600">
            No recent plays
          </Text>
        ) : (
          list.map((r, i) => {
            const win = Number(r.winAmount ?? r.win ?? 0);
            const bet = Number(r.sessionStake ?? r.betAmount ?? r.totalBet ?? 0);
            const isWin = win > 0;
            const rowColor = isWin ? "#68d391" : "#f56565";
            const key = r._id ?? r.id ?? `live-${i}-${r.userId}-${r.createdAt}`;
            const fullName =
              r.userName != null && String(r.userName).trim() !== "" ? String(r.userName) : "—";

            return (
              <HStack
                key={key}
                spacing="8px"
                py="6px"
                align="center"
                fontSize="13px"
                fontWeight="700"
                color={rowColor}
                borderBottom="1px solid rgba(255,255,255,0.06)"
                _last={{ borderBottom: "none" }}
              >
                <HStack flex="1.15" minW={0} spacing="8px">
                  <Avatar size="xs" src={r.avatar || undefined} name={r.userName || "?"} boxSize="22px" />
                  <Tooltip label={fullName} placement="top" hasArrow>
                    <Text noOfLines={1} minW={0} cursor="default">
                      {fullName}
                    </Text>
                  </Tooltip>
                </HStack>
                <Text flex="0.85" textAlign="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {Number.isFinite(bet) ? bet.toFixed(2) : "—"}
                </Text>
                <Text flex="0.85" textAlign="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {Number.isFinite(win) ? win.toFixed(2) : "—"}
                </Text>
              </HStack>
            );
          })
        )}
      </Box>
    </Box>
  );
}
