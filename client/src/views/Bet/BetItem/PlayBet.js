import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify"

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import CardBody from "components/Card/CardBody";
import {
    Flex,
    SimpleGrid,
    Grid,
    GridItem,
    Box,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Text,
    Button,
} from "@chakra-ui/react";

import { useSelector, useDispatch } from "react-redux";
import { buyTickets, getSoldTickets } from "action/BetActions";
import { useAblyTicketUpdates } from 'hooks/useAblyTicketUpdates'
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

import ClickButton from "components/Input/ClickButton";

import StyleRoundedIcon from '@mui/icons-material/StyleRounded';
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded';
import BakeryDiningRoundedIcon from '@mui/icons-material/BakeryDiningRounded';

const remainingTimeStr = [
    "betAStartTime", "betBStartTime", "betCStartTime"
]

export default function PlayBet(props) {
    const showRemainingTime = props.showRemainingTime !== undefined ? props.showRemainingTime : true;
    let location = useLocation();
    const dispatch = useDispatch();
    const history = useHistory();
    const BET_ID = React.useMemo(() => {
        return props.betData?.betId || props.betId || null;
    }, [props.betData?.betId, props.betId]);

    const TOTAL_TICKETS = 100;

    const numbers_bet = Array.from({ length: TOTAL_TICKETS }, (_, i) => i + 1);
    const visibleNumbers_bet = numbers_bet;

    const user = useSelector((state) => state.user.userInfo);
    const userAuthId = user?.userAuthId || user?._id?.toString();

    // Tier Level 
    const level = location.pathname.slice(-5) === "tierA" ? 0 : (location.pathname.slice(-5) === "tierB" ? 1 : 2);
    // Limit of the abailabel
    // const limitTickets = user.membership === 0 ? 5 : (user.membership === 1 ? 50 : 100)
    // Landom number = limitTickets
    const landomNumber = 15;

    // Buy Ticket hook - gets real-time sold tickets from Ably
    const { soldTickets, setSoldTickets, ticketOwners, setTicketOwners, isConnected, connectionStatus } = useAblyTicketUpdates(userAuthId, BET_ID, level);
    const [myTickets, setMyTickets] = useState([]); // Tickets bought by current user
    const [selectedTickets, setSelectedTickets] = useState([]); // Tickets selected by user (not yet purchased)
    const [landomSelectedTickets, setLandomSelectedTickets] = useState([]); // Tickets selected via landom buttons
    const landomSelectedTicketsRef = useRef([]); // Ref to track landom selections for synchronous access
    const [isLoading, setIsLoading] = useState(false);
    const [remainingTime, setRemainingTime] = useState();

    useEffect(() => {
        const key = remainingTimeStr[props.level];
        let startTime = sessionStorage.getItem(key);
        if (!startTime) {
            startTime = Date.now() - props.betData.differenceTime;
            sessionStorage.setItem(key, startTime);
        } else {
            startTime = Number(startTime);
        }
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 30000 - elapsed);
            setRemainingTime(remaining);
            if (remaining === 0) {
                clearInterval(interval);
                sessionStorage.removeItem(key);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [props.betData]);


    useEffect(() => {
        setSoldTickets([]);
        setTicketOwners({});
        setMyTickets([]);
        setSelectedTickets([]);
        setLandomSelectedTickets([]);
        // Fetch initial data for new round
    }, [props.betData]);

    useEffect(() => {
        console.log("🔌 [PlayBet] Ably connection status:", connectionStatus, "Connected:", isConnected);
    }, [connectionStatus, isConnected]);

    // Fetch initial sold tickets when component loads

    useEffect(() => {
        if (!userAuthId || !BET_ID) return;

        const fetchSoldTickets = async () => {
            try {
                const betData = {
                    betId: BET_ID,
                    level: level
                }
                const data = await getSoldTickets(betData, history);

                console.log("Connect to the Backend");

                if (data.soldTickets && data.soldTickets.length > 0) {
                    // Ensure all tickets are numbers
                    const ticketNumbers = data.soldTickets.map(t => Number(t));
                    setSoldTickets(ticketNumbers);
                }

                if (data.ticketOwners) {
                    // Convert keys to numbers
                    const ownersMap = {};
                    Object.keys(data.ticketOwners).forEach(key => {
                        ownersMap[Number(key)] = String(data.ticketOwners[key]); // Ensure owner ID is string
                    });
                    setTicketOwners(ownersMap);
                }

                // Set myTickets from API response (this is the source of truth on initial load)
                if (data.myTickets) {
                    const myTicketNumbers = data.myTickets.map(t => Number(t));
                    setMyTickets(myTicketNumbers);

                }
            } catch (error) {
                console.error("Error fetching sold tickets:", error);
            }
        };
        if (userAuthId) {
            fetchSoldTickets();
        }
    }, [setSoldTickets, setTicketOwners, userAuthId, props.betData]);

    // Update myTickets when ticketOwners changes via Ably
    useEffect(() => {
        if (userAuthId && Object.keys(ticketOwners).length > 0) {
            const userAuthIdStr = String(userAuthId);
            const myTicketsList = Object.keys(ticketOwners)
                .filter(ticket => {
                    const ownerId = String(ticketOwners[ticket]);
                    return ownerId === userAuthIdStr;
                })
                .map(Number);

            // Update myTickets based on ticketOwners (source of truth)
            // This ensures consistency after Ably updates or initial fetch
            if (myTicketsList.length > 0) {
                setMyTickets(prev => {
                    // Merge to keep any optimistic updates, but ticketOwners is source of truth
                    const merged = [...new Set([...prev, ...myTicketsList])];
                    return merged;
                });
            }
        }
    }, [ticketOwners, userAuthId]);

    // Keep ref in sync with landomSelectedTickets state
    useEffect(() => {
        landomSelectedTicketsRef.current = landomSelectedTickets;
    }, [landomSelectedTickets]);

    // Remove selected tickets if they become sold by other users
    useEffect(() => {
        setSelectedTickets(prev => {
            const filtered = prev.filter(ticket => {
                const ticketNum = Number(ticket);
                const isSold = soldTickets.some(t => Number(t) === ticketNum);
                const isMyTicket = myTickets.some(t => Number(t) === ticketNum);
                // Remove if sold and not owned by me
                return !(isSold && !isMyTicket);
            });

            if (filtered.length !== prev.length) {
                const removed = prev.filter(t => !filtered.includes(t));
                setLandomSelectedTickets(prevLandom => {
                    const updated = prevLandom.filter(t => !removed.includes(t));
                    return updated;
                });
            }

            return filtered;
        });
    }, [soldTickets, myTickets]);

    // Toggle ticket selection (instead of immediate purchase)
    function toggleTicketSelection(num) {
        const ticketNum = Number(num);

        // Don't allow selection if already sold or owned by user
        const isSold = soldTickets.some(t => Number(t) === ticketNum);
        const isMyTicket = myTickets.some(t => Number(t) === ticketNum);
        const isOtherUserTicket = isSold && !isMyTicket;

        if (isOtherUserTicket || isMyTicket || isLoading) {
            return;
        }

        if (!user || !userAuthId) {
            alert("Please login to select tickets");
            return;
        }

        setSelectedTickets(prev => {
            if (prev.includes(ticketNum)) {
                // Deselect ticket
                // Also remove from landom selected if it was there
                setLandomSelectedTickets(prevLandom =>
                    prevLandom.filter(t => t !== ticketNum)
                );
                return prev.filter(t => t !== ticketNum);
            } else {
                // Select ticket
                return [...prev, ticketNum];
            }
        });
    }

    // Select random tickets based on the number clicked
    function selectRandomTickets(count) {
        setSelectedTickets([]);
        if (!user || !userAuthId) {
            toast.warning("Please sign in to select tickets");
            return;
        }

        if (isLoading) {
            return;
        }

        // Use functional updates to get current state
        setSelectedTickets(prevSelected => {
            // Get current landom selections from ref (synchronous access)
            const prevLandom = landomSelectedTicketsRef.current;

            // Remove previous landom-selected tickets to get manually selected only
            const manuallySelected = prevSelected.filter(t => !prevLandom.includes(t));

            // Check limit (excluding previous landom selections since we're replacing them)
            const currentTotal = myTickets.length + manuallySelected.length;
            let adjustedCount = count;

            // Get all available tickets (not sold, not my tickets, not manually selected)
            const availableTickets = numbers_bet.filter(ticketNum => {
                const num = Number(ticketNum);
                const isSold = soldTickets.some(t => Number(t) === num);
                const isMyTicket = myTickets.some(t => Number(t) === num);
                const isManuallySelected = manuallySelected.includes(num);
                return !isSold && !isMyTicket && !isManuallySelected;
            });

            if (availableTickets.length === 0) {
                toast.warning("No available tickets to select");
                return prevSelected; // Keep current selection
            }

            // If requested count is more than available, use all available
            const ticketsToSelect = Math.min(adjustedCount, availableTickets.length);

            // Shuffle array and pick random tickets
            const shuffled = [...availableTickets].sort(() => Math.random() - 0.5);
            const randomTickets = shuffled.slice(0, ticketsToSelect).map(t => Number(t));

            // Update landom selected tickets (ref will be synced via useEffect)
            setLandomSelectedTickets(randomTickets);

            // Return new selection: manually selected + new random tickets (replacing old landom selections)
            const newSelection = [...new Set([...manuallySelected, ...randomTickets])];

            if (ticketsToSelect < count) {
                toast.info(`Only ${ticketsToSelect} ticket(s) are available to select`);
            }

            return newSelection;
        });
    }

    // Purchase all selected tickets in a single request
    async function buySelectedTickets() {

        if (selectedTickets.length === 0) {
            alert("Please select at least one ticket to purchase");
            return;
        }

        if (!user || !userAuthId) {
            alert("Please login to buy tickets");
            return;
        }

        setIsLoading(true);

        const userAuthIdStr = String(userAuthId);
        const ticketsToBuy = [...selectedTickets]; // Copy array to avoid mutation during purchase

        // // Filter out tickets that are already sold (client-side validation)
        const availableTickets = ticketsToBuy.filter(ticketNum => {
            const isSold = soldTickets.some(t => Number(t) === ticketNum);
            const isMyTicket = myTickets.some(t => Number(t) === ticketNum);
            return !(isSold && !isMyTicket);
        });

        try {
            const buyData = {
                user: user._id,
                tickets: availableTickets,
                betId: BET_ID,
                level: level,
                membership: user.membership || 0
            };

            const result = await buyTickets(buyData, dispatch, history);

            toast.success(`Successfully purchased ${result.tickets?.length || availableTickets.length} ticket(s)`)
            // Optimistically update local state so ticket buttons change immediately
            const purchasedTickets = (result && Array.isArray(result.tickets) && result.tickets.length > 0)
                ? result.tickets.map(Number)
                : availableTickets.map(Number);

            // Mark tickets as sold
            setSoldTickets(prev => {
                const prevNums = prev.map(Number);
                const newOnes = purchasedTickets.filter(t => !prevNums.includes(t));
                if (newOnes.length === 0) return prev;
                return [...prevNums, ...newOnes].sort((a, b) => a - b);
            });

            // Mark tickets as mine (blue)
            setMyTickets(prev => {
                const prevNums = prev.map(Number);
                const newOnes = purchasedTickets.filter(t => !prevNums.includes(t));
                if (newOnes.length === 0) return prev;
                return [...prevNums, ...newOnes].sort((a, b) => a - b);
            });

            // Update ticket owners map
            setTicketOwners(prev => {
                const updated = { ...prev };
                purchasedTickets.forEach(ticketNum => {
                    updated[Number(ticketNum)] = userAuthIdStr;
                });
                return updated;
            });

            // Clear selected tickets immediately after successful purchase
            // Don't refetch - Ably will update tickets in real-time automatically
            setSelectedTickets([]);
            setLandomSelectedTickets([]);
            landomSelectedTicketsRef.current = [];
        } catch (error) {
            console.error("Error buying tickets:", error);

            // Rollback optimistic update on error
            availableTickets.forEach(ticketNum => {
                setSoldTickets(prev => prev.filter(t => t !== ticketNum));
                setMyTickets(prev => prev.filter(t => t !== ticketNum));
                setTicketOwners(prev => {
                    const newOwners = { ...prev };
                    delete newOwners[ticketNum];
                    return newOwners;
                });
            });

            // If some tickets were sold, remove them from selection
            if (error.response?.data?.soldTickets) {
                setSelectedTickets(prev => prev.filter(t => !error.response.data.soldTickets.includes(t)));
            }
        } finally {
            setIsLoading(false);
        }
    }

    const remainingTickets = TOTAL_TICKETS - soldTickets.length;

    return (
        <Grid templateColumns={{ lg: "3fr 1fr" }}>
            <GridItem
                borderRight={{ lg: '1px solid #e2e8f0' }}
                borderBottom={{ sm: '1px solid #e2e8f0', lg: 'none' }}
                pr={{ md: 0, lg: "18px" }}>
                <SimpleGrid
                    templateColumns={
                        showRemainingTime
                            ? { sm: '1fr 1fr', md: '1fr 1fr 1fr' }
                            : { sm: '1fr 1fr' }
                    }
                    spacing='24px'
                    my='18px'
                >
                    <Card bg="none" border="2px solid white">
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <BakeryDiningRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                            <Stat me='auto' textAlign="center">
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='normal' pb='2px'>
                                    BET ID
                                </StatLabel>
                                <StatNumber fontSize='lg' color='#00D4FF'>
                                    {BET_ID}
                                </StatNumber>
                            </Stat>
                        </Flex>
                    </Card>

                    <Card minH='83px' bg="none" border="2px solid white">
                        <CardBody>
                            <Flex flexDirection='row' align='center' justify='center' w='100%'>
                                <StyleRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                                <Stat me='auto' textAlign="center">
                                    <StatLabel fontSize='sm' color='#00D4FF' fontWeight='normal' pb='2px'>
                                        Remaining Ticket
                                    </StatLabel>
                                    <Flex justifyContent="center">
                                        <StatNumber fontSize='lg' color='#00D4FF' fontWeight='bold'>
                                            {remainingTickets}
                                        </StatNumber>
                                        <StatHelpText
                                            alignSelf='flex-end'
                                            justifySelf='flex-end'
                                            m='0px'
                                            color='#00D4FF'
                                            fontWeight='bold'
                                            ps='3px'
                                            fontSize='lg'>
                                            /
                                        </StatHelpText>
                                        <StatNumber fontSize='lg' color='#00D4FF' fontWeight='bold'>
                                            {TOTAL_TICKETS}
                                        </StatNumber>
                                    </Flex>
                                </Stat>
                            </Flex>
                        </CardBody>
                    </Card>

                    {showRemainingTime && (
                        <Card bg="none" border="2px solid white">
                            <CardBody>
                                <Flex flexDirection='row' align='center' justify='center' w='100%'>
                                    <AlarmRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                                    <Stat me='auto' textAlign="center">
                                        <StatLabel fontSize='sm' color='#00D4FF' fontWeight='normal' pb='2px'>
                                            Remaining Time
                                        </StatLabel>
                                        <StatNumber fontSize="lg" color="#00D4FF">
                                            {(remainingTime / 1000).toFixed(1)}
                                        </StatNumber>
                                    </Stat>
                                </Flex>
                            </CardBody>
                        </Card>
                    )}
                </SimpleGrid>

                <Box>
                    <Grid
                        templateColumns={{
                            sm: "repeat(8, 1fr)",
                            md: "repeat(10, 1fr)",
                        }}
                        pb="18px"
                        gap="18px"
                    >
                        {visibleNumbers_bet.map((num_bet) => {
                            // Ensure consistent number comparison
                            const ticketNum = Number(num_bet);
                            const isSold = soldTickets.some(t => Number(t) === ticketNum);
                            const isMyTicket = myTickets.some(t => Number(t) === ticketNum);
                            const isOtherUserTicket = isSold && !isMyTicket;
                            const isSelected = selectedTickets.includes(ticketNum);

                            return (
                                <Button
                                    key={num_bet}
                                    h="40px"
                                    w="40px"
                                    bg={
                                        isMyTicket
                                            ? "blue.500"
                                            : isOtherUserTicket
                                                ? "gray.600"
                                                : isSelected
                                                    ? "white"
                                                    : "#00D4FF"
                                    }
                                    color={isSelected ? "#00D4FF" : "white"}
                                    variant="brand"
                                    placeSelf="center"
                                    onClick={() => toggleTicketSelection(num_bet)}
                                    isDisabled={isOtherUserTicket || isLoading || isMyTicket}
                                    cursor={isOtherUserTicket || isMyTicket ? "not-allowed" : "pointer"}
                                    opacity={isOtherUserTicket ? 0.5 : 1}
                                    border={isSelected ? "2px solid #00D4FF" : "2px solid white"}
                                    borderColor={isOtherUserTicket ? "transparent" : "#00D4FF"}
                                    title={
                                        isMyTicket
                                            ? `Your ticket ${num_bet}`
                                            : isOtherUserTicket
                                                ? "Ticket already sold"
                                                : isSelected
                                                    ? `Selected ticket ${num_bet} - Click to deselect`
                                                    : `Select ticket ${num_bet}`
                                    }
                                    _hover={
                                        isMyTicket || isOtherUserTicket
                                            ? undefined
                                            : { bg: isSelected ? "#00a2ffff" : "#ffffffa3", color: "#00D4FF" }
                                    }
                                >
                                    {num_bet}
                                </Button>
                            );
                        })}
                    </Grid>
                </Box>
            </GridItem>
            <GridItem
                pl={{ md: 0, lg: "18px" }}
                pt="18px">
                <Card minH='83px' bg="none" border="2px solid white" mb="18px" maxW="400px" placeSelf="center">
                    <CardBody>
                        <Flex flexDirection='row' align='center' justify='center' w='100%'>
                            <StyleRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                            <Stat me='auto' textAlign="center">
                                <StatLabel fontSize='sm' color='#00D4FF' fontWeight='normal' pb='2px'>
                                    Tickets
                                </StatLabel>
                                <Flex justifyContent="center">
                                    <StatNumber fontSize='lg' color='#00D4FF' fontWeight='bold'>
                                        {selectedTickets?.length || 0}
                                    </StatNumber>
                                </Flex>
                            </Stat>
                        </Flex>
                    </CardBody>
                </Card>
                <Grid templateColumns={{ sm: '1fr 1fr 1fr 1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr 1fr', lg: "1fr 1fr" }} gap="18px">
                    {Array.from({ length: landomNumber }).map((_, i) => {
                        const ticketCount = i < 5 ? (i + 1) : (10 * i - 40);
                        return (
                            <Button
                                key={i}
                                h="40px"
                                w="75px"
                                bg="#00D4FF"
                                justifySelf="center"
                                color="#fff"
                                variant='brand'
                                cursor="pointer"
                                border="2px solid white"
                                onClick={() => selectRandomTickets(ticketCount)}
                                isDisabled={isLoading}
                                _hover={{ bg: "white", color: "#00D4FF" }}
                                title={`Select ${ticketCount} random ticket(s)`}
                            >
                                {ticketCount}
                            </Button>
                        );
                    })}
                </Grid>
                <Flex justify="center" mt="20px" mb="20px">
                    <ClickButton
                        label={selectedTickets.length > 0 ? `BUY ${selectedTickets.length} TICKET(S)` : "SELECT TICKETS TO BUY"}
                        width="100%"
                        onClick={buySelectedTickets}
                        disabled={selectedTickets.length === 0 || isLoading}
                        isLoading={isLoading}
                        loadingText="Purchasing..."
                    />
                </Flex>

            </GridItem>
        </Grid>
    )
}