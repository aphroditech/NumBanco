import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Flex,
  Grid,
  Tooltip,
  HStack,
  Avatar,
  Box
} from "@chakra-ui/react";
import React, { useMemo, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useAblyTicketUpdates } from "hooks/useAblyTicketUpdates";

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";

import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';

import { getCurrentBetData, getSoldTickets } from "action/BetActions";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import proring from "assets/badge/GOLDEN_CIRCLE.png"
import plusring from "assets/badge/BLUE_CIRCLE.png"

const betUserStyles = `
  @keyframes betuser-row-slide-in {
    0% {
      transform: translateX(28px);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  tr.betuser-new td {
    animation: betuser-row-slide-in 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
`;

if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("bet-user-styles");
  if (existingStyle) {
    existingStyle.textContent = betUserStyles;
  } else {
    const styleSheet = document.createElement("style");
    styleSheet.id = "bet-user-styles";
    styleSheet.textContent = betUserStyles;
    document.head.appendChild(styleSheet);
  }
}

export default function BetUser({ value: BET_ID, data }) {
  // console.log(data);
  const location = useLocation();
  const dispatch = useDispatch();

  // Determine tier level from URL
  const Level = useMemo(() => {
    if (location.pathname.includes("/tierA")) return 0;
    if (location.pathname.includes("/tierB")) return 1;
    if (location.pathname.includes("/tierC")) return 2;
    return null;
  }, [location.pathname]);
  const history = useHistory();
  // Get userAuthId from Redux
  const user = useSelector((state) => state.user.userInfo);
  const userAuthId = user?.userAuthId || user?._id?.toString();

  // Subscribe to Ably for real-time ticket updates
  let { currentBetData, setCurrentBetData, setTicketOwners, soldTickets, setSoldTickets } = useAblyTicketUpdates(userAuthId, BET_ID, Level);
  const [newHolderIds, setNewHolderIds] = useState(new Set());
  const prevHolderIdsRef = useRef(new Set());
  const hasInitializedRef = useRef(false);
  // Default to empty array if Ably hasn't sent data yet
  // Initialize sold tickets and ticket owners when BET_ID or Level changes
  useEffect(() => {
    setSoldTickets([]);
    setTicketOwners({});
  }, [BET_ID, Level, setSoldTickets]);

  /* Fetch sold tickets */
  useEffect(() => {
    let isMounted = true;

    const fetchSoldTickets = async () => {
      try {
        if (!userAuthId) return;
        const data = await getSoldTickets({ betId: BET_ID, level: Level }, history);
        if (isMounted) {
          setCurrentBetData(data.betTicket);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSoldTickets();

    return () => {
      isMounted = false;
    };
  }, [BET_ID, Level, userAuthId, setSoldTickets, setTicketOwners]);

  useEffect(() => {
    if (!BET_ID || Level === null) return;

    let isMounted = true; // ✅ track mount state

    const fetchData = async () => {
      try {
        const payload = {
          betId: BET_ID,
          level: Level,
        };

        const virtualData = await getCurrentBetData(payload);

        if (isMounted) {
          // ✅ ONLY update state if component is still mounted
          setCurrentBetData(virtualData ?? {});
        }
      } catch (error) {
        if (isMounted) {
          console.error("fetchData error:", error);
        }
      }
    };

    fetchData();

    // ✅ CLEANUP (VERY IMPORTANT)
    return () => {
      isMounted = false;
    };
  }, [BET_ID, Level]);

  useEffect(() => {
    if (!userAuthId || !BET_ID) return;

    let isMounted = true;

    const fetchSoldTickets = async () => {
      try {
        const data = await getSoldTickets({ betId: BET_ID, level: Level }, history);

        if (!isMounted) return;

        if (data?.soldTickets) {
          setSoldTickets(data.soldTickets.map(Number));
        }

        if (data?.ticketOwners) {
          const ownersMap = {};
          Object.keys(data.ticketOwners).forEach((key) => {
            ownersMap[Number(key)] = String(data.ticketOwners[key]);
          });
          setTicketOwners(ownersMap);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching sold tickets:", error);
        }
      }
    };

    fetchSoldTickets();

    return () => {
      isMounted = false;
    };
  }, [userAuthId, BET_ID, Level]);

  const sortedTicketHolders = useMemo(() => {
    if (currentBetData?.level !== Level) return [];

    return [...(currentBetData?.ticketHolder ?? [])].sort(
      (a, b) => b.ticketCnt - a.ticketCnt
    );
  }, [soldTickets, BET_ID]);

  const getHolderId = (holder) => {
    if (!holder) return "";
    return holder._id || holder.userId || `${holder.altas || "user"}-${holder.ticketCnt || 0}`;
  };

  useEffect(() => {
    if (!sortedTicketHolders || sortedTicketHolders.length === 0) {
      prevHolderIdsRef.current = new Set();
      setNewHolderIds(new Set());
      hasInitializedRef.current = true;
      return;
    }

    const currentIds = new Set(sortedTicketHolders.map(getHolderId));

    if (!hasInitializedRef.current) {
      prevHolderIdsRef.current = currentIds;
      setNewHolderIds(new Set());
      hasInitializedRef.current = true;
      return;
    }

    const incomingIds = new Set();
    currentIds.forEach((id) => {
      if (!prevHolderIdsRef.current.has(id)) incomingIds.add(id);
    });

    setNewHolderIds(incomingIds);
    prevHolderIdsRef.current = currentIds;

    if (incomingIds.size > 0) {
      const timeoutId = setTimeout(() => {
        setNewHolderIds(new Set());
      }, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [sortedTicketHolders]);

  return (
    <Grid>
      <Card>
        <CardHeader mb="20px" ps="22px" w="100%">
          <Flex direction="column">

            <Text color="#00D4FF"
              fontWeight="bold" m="auto" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center">
              <GroupsRoundedIcon style={{ fontSize: "40px", color: "#00D4FF", marginRight: "8px" }} />Bet Users
            </Text>
          </Flex>
        </CardHeader>

        <TableContainer
          mt={4}
          overflowY="auto"
          overflowX="hidden"
          maxHeight="780px"
          sx={{
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#555b5e",
              borderRadius: "8px",
            },
          }}
        >
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th color="white" className="real_th_font">User</Th>
                <Th color="white" isNumeric className="real_th_font">
                  Tickets
                </Th>
              </Tr>
            </Thead>

            <Tbody>
              {sortedTicketHolders.map((holder) => {
                const holderId = getHolderId(holder);
                return (
                  <Tr key={holderId} className={newHolderIds.has(holderId) ? "betuser-new" : undefined}>
                    <Td
                      color="white"
                      fontWeight="500"
                      borderBottomColor="#56577A"
                    >
                      <HStack spacing={3}>
                        <Box position="relative" display="inline-block" me="5px" w="30px" h="30px">
                          <Box
                            w="30px"
                            h="30px"
                            borderRadius="full"
                            backgroundImage={`url(${holder.avatar})`}
                            backgroundSize="cover"
                          />
                          <Box
                            position="absolute"
                            top="-2.5px"
                            left="-3px"
                            w="37px"
                            h="37px"
                            backgroundImage={`url(${holder.membership === 2 && proring || holder.membership === 1 && plusring})`}
                            backgroundSize="contain"
                            backgroundPosition="center"
                            zIndex="6"
                          />
                        </Box>
                        <Text lineHeight="1">
                          {holder.altas}
                        </Text>
                      </HStack>
                    </Td>
                    <Td color="white" isNumeric borderBottomColor='#56577A'>
                      <Text lineHeight={3}>
                        {holder.ticketCnt}
                      </Text>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </Card>
    </Grid>
  );
}
