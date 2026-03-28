import React, { memo } from 'react';
import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Image } from '@chakra-ui/react';
import truncateToTwo, { formatUsdDisplay } from 'variables/truncateToTwo';

/** Same idea as Double live feed — `public/avatars/pfp1..pfp15.png`. */
function plinkoLivePfpUrl(userKey) {
    const s = String(userKey || 'player');
    let hash = 0;
    for (let i = 0; i < s.length; i += 1) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    const avatarIdx = (Math.abs(hash) % 15) + 1;
    const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    return `${base}/avatars/pfp${avatarIdx}.png`;
}

function rowProfit(r) {
    if (typeof r.profit === 'number' && Number.isFinite(r.profit)) return r.profit;
    const w = Number(r.win);
    const b = Number(r.betAmount);
    if (Number.isFinite(w) && Number.isFinite(b)) return Math.round((w - b) * 100) / 100;
    return Number.isFinite(w) ? w : 0;
}

const LiveResultRow = memo(function LiveResultRow({ r, idx }) {
    const userKey = String(r.userId ?? r.user ?? r.id ?? idx);
    const fallbackSrc = plinkoLivePfpUrl(userKey);
    const raw = (r.avatar || '').trim();
    const junkAvatar = raw === 'undefined' || raw === 'null' || raw === '';
    const src = junkAvatar ? fallbackSrc : raw;
    const profit = rowProfit(r);
    const isWin = profit > 0;

    return (
        <Tr borderBottom="1px solid rgba(255,255,255,0.06)">
            <Td px="0" py="8px" verticalAlign="middle">
                <Flex align="center" gap="8px" minW={0}>
                    <Image
                        boxSize="24px"
                        borderRadius="full"
                        objectFit="cover"
                        flexShrink={0}
                        src={src}
                        alt=""
                        bg="whiteAlpha.100"
                        onError={(e) => {
                            const el = e.currentTarget;
                            if (el.src !== fallbackSrc) el.src = fallbackSrc;
                        }}
                    />
                    <Text fontSize="xs" fontWeight="700" color="rgba(255,255,255,0.92)" noOfLines={1}>
                        {r.user || '—'}
                    </Text>
                </Flex>
            </Td>
            <Td px="0" py="8px" textAlign="center" fontSize="xs" fontWeight="800" color="#00D4FF">
                x{truncateToTwo(r.multiplier)}
            </Td>
            <Td
                px="0"
                py="8px"
                textAlign="right"
                fontSize="xs"
                fontWeight="800"
                color={isWin ? '#68d391' : '#f56565'}
            >
                {formatUsdDisplay(profit)}
            </Td>
        </Tr>
    );
});

/**
 * Rubic-style "Live Results" panel.
 * Real rows from API (`PlinkoResult`, non-bot); bots append via Ably only.
 */
export default function PlinkoLiveResults({ rows, desktopMinH = '520px' }) {
    const list = Array.isArray(rows) ? rows : [];

    return (
        <GridItem
            area="empty"
            minW={0}
            maxW="100%"
            display="flex"
            flexDirection="column"
            minH={{ base: '250px', '1550px': desktopMinH }}
            h="100%"
            alignSelf="stretch"
        >
            <Box
                w="100%"
                maxW="100%"
                flex="1"
                minH={{ base: '250px', '1550px': '100%' }}
                h="100%"
                bg="#2b2b2b"
                borderRadius="14px"
                border="1px solid rgba(255,255,255,0.1)"
                boxShadow="none"
                overflow="hidden"
                display="flex"
                flexDirection="column"
                p="16px"
                pt="20px"
            >
                <Text
                    px="12px"
                    pb="8px"
                    fontSize="sm"
                    fontWeight="800"
                    color="rgba(255,255,255,0.92)"
                    letterSpacing="0.02em"
                    flexShrink={0}
                >
                    Live Results
                </Text>
                <Box
                    overflowX="hidden"
                    width="100%"
                    overflowY="auto"
                    flex="1"
                    minH="0"
                    sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                    }}
                >
                    <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: 'fixed' }}>
                        <Thead>
                            <Tr borderBottom="1px solid rgba(255,255,255,0.12)">
                                <Th
                                    color="rgba(255,255,255,0.9)"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px="0"
                                    py="4px"
                                    h="32px"
                                    borderBottom="none"
                                    whiteSpace="nowrap"
                                    w="42%"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                >
                                    User
                                </Th>
                                <Th
                                    color="rgba(255,255,255,0.9)"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px="0"
                                    py="4px"
                                    h="32px"
                                    borderBottom="none"
                                    textAlign="center"
                                    whiteSpace="nowrap"
                                    w="28%"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                >
                                    Multiplier
                                </Th>
                                <Th
                                    color="rgba(255,255,255,0.9)"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px="0"
                                    py="4px"
                                    h="32px"
                                    borderBottom="none"
                                    textAlign="right"
                                    whiteSpace="nowrap"
                                    w="30%"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                >
                                    Profit
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {list.length === 0 ? (
                                <Tr>
                                    <Td colSpan={3} py="24px" textAlign="center" color="rgba(255,255,255,0.45)" fontSize="sm">
                                        Session feed appears after bets
                                    </Td>
                                </Tr>
                            ) : (
                                list.map((r, idx) => <LiveResultRow key={r.id || idx} r={r} idx={idx} />)
                            )}
                        </Tbody>
                    </Table>
                </Box>
            </Box>
        </GridItem>
    );
}
