import React, { useState, useEffect, useCallback } from "react";
import {
  Flex, Grid, Box, Text, useDisclosure, Tooltip, Button, GridItem, Badge, IconButton, VStack, Modal, ModalOverlay, UnorderedList, ListItem, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
} from "@chakra-ui/react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { getSoldTickets } from "action/BetActions";

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import Dialog from "components/Dialog/Dialog";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import NotStartedRoundedIcon from '@mui/icons-material/NotStartedRounded';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PixIcon from '@mui/icons-material/Pix';

import { useAblyGraph } from "hooks/useAblyGraphUpdates";
import { useAblyTicketUpdates } from "hooks/useAblyTicketUpdates";
import { useAblyBetStart } from "hooks/useAblyBetStart";
import { useAblyCloseModal } from "hooks/useAblyCloseModal";
import PlayBet from "./PlayBet";
import PlayPrebet from "./PlayPrebet";
import BetBalanceGraph from "./BetBalanceGraph";
import LineChart from 'components/Charts/LineChart';
import { useMemo } from 'react';
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

import {
  lineChartDataDashboard2,
  lineChartOptionsDashboard2
} from 'variables/charts';

const TOTAL_TICKETS = 100;
const SIZE = 320;
const STROKE = 18;
const RADIUS = (SIZE - 30) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const remainingTimeStr = [
  "betAStartTime", "betBStartTime", "betCStartTime"
];

export default function BetChartGraph(props) {
  const [remainingTime, setRemainingTime] = useState();
  const location = useLocation();
  const user = useSelector((state) => state.user.userInfo);
  const userAuthId = user?.userAuthId || user?._id?.toString();
  const BET_ID = props.value?.betId || props.betId || null;

  const getLevelFromPath = () => {
    if (location.pathname.includes("/tierA")) return 0;
    if (location.pathname.includes("/tierB")) return 1;
    if (location.pathname.includes("/tierC")) return 2;
    return null;
  };
  const history = useHistory();
  const level = getLevelFromPath();
  useAblyGraph();

  const [play, setPlay] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const closeModalFunction = useCallback(() => {
    if (isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  const { soldTickets, setSoldTickets, setTicketOwners, timing, setTiming } = useAblyTicketUpdates(userAuthId, BET_ID, level);
  useAblyCloseModal(closeModalFunction, user?.userId);

  const handleBetEnd = useCallback(() => {
    if (isOpen && !play) onClose();
  }, [isOpen, play, onClose]);

  const chartData = useMemo(() => {
    // Find the maximum time in timing data
    const maxTime = timing?.length > 0
      ? Math.max(...timing.map(item => item.time))
      : 0;

    // Use actual max time if less than 30, otherwise use 30
    const displayMaxTime = Math.min(maxTime, 30);

    const sortedTiming = timing?.length > 0
      ? [...timing].sort((a, b) => a.time - b.time)
      : [];

    // Calculate cumulative data for every second up to display max time
    const cumulativeData = [];
    let cumulativeCount = 0;

    for (let time = 0; time <= displayMaxTime; time++) {
      // Find entries at this specific time
      const entriesAtTime = sortedTiming.filter(item => item.time === time);

      let usersAtTime = [];
      if (entriesAtTime.length > 0) {
        cumulativeCount += entriesAtTime.reduce((sum, item) => sum + item.ticketCnt, 0);
        usersAtTime = entriesAtTime.map(item => ({ altas: item.altas, ticketCnt: item.ticketCnt }));
      }

      // If we're at the display max time and it's 30, add all tickets beyond 30
      if (time === 30 && maxTime > 30) {
        const entriesBeyond30 = sortedTiming.filter(item => item.time > 30);
        if (entriesBeyond30.length > 0) {
          cumulativeCount += entriesBeyond30.reduce((sum, item) => sum + item.ticketCnt, 0);
          usersAtTime = usersAtTime.concat(entriesBeyond30.map(item => ({ altas: item.altas, ticketCnt: item.ticketCnt })));
        }
      }

      cumulativeData.push({
        y: cumulativeCount,
        x: time,
        users: usersAtTime,
      });
    }

    return [{
      name: 'Cumulative Tickets Sold',
      data: cumulativeData,
    }];
  }, [timing]);

  const chartOptions = useMemo(() => {
    // Find the maximum time in timing data
    const maxTime = timing?.length > 0
      ? Math.max(...timing.map(item => item.time))
      : 0;

    // Use actual max time if less than 30, otherwise use 30
    const timeRange = Math.min(maxTime, 30) + 1;

    // Create a Set of times that have actual entries in timing (not just cumulative data points)
    const timingTimesSet = new Set(
      timing?.map(item => item.time) || []
    );

    return {
      ...lineChartOptionsDashboard2,
      chart: {
        ...lineChartOptionsDashboard2.chart,
        animations: {
          enabled: false,
          easing: 'linear',
          speed: 1000,
          animateGradually: {
            enabled: true,
            delay: 50,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 400,
          },
        },
      },
      stroke: {
        ...lineChartOptionsDashboard2.stroke,
        curve: 'smooth', // Smooth curve for the line
        width: 3, // Line width
      },
      markers: {
        size: 0, // Hide markers for cleaner look, but can be enabled for animation
        hover: {
          size: 5,
        },
      },
      fill: {
        ...lineChartOptionsDashboard2.fill,
        type: 'gradient',
        gradient: {
          ...lineChartOptionsDashboard2.fill.gradient,
        },
      },
      dataLabels: {
        ...lineChartOptionsDashboard2.dataLabels,
        enabled: true,
        filter: function (value, opts) {
          try {
            const { dataPointIndex, w } = opts || {};
            // Get the data point
            const seriesData = w?.globals?.initialSeries?.[0]?.data || [];
            const dataPoint = seriesData[dataPointIndex];

            if (!dataPoint) return false;

            const time = dataPoint.x;
            const users = dataPoint.users || [];

            // Only show label if this time has actual timing entries (users array is not empty)
            // This means there are ticket sales recorded at this specific time
            if (time !== undefined && users.length > 0) {
              return true;
            }
            return false;
          } catch (error) {
            return false;
          }
        },
        formatter: function (value, opts) {
          try {
            const { dataPointIndex, w } = opts || {};
            // Get the data point
            const seriesData = w?.globals?.initialSeries?.[0]?.data || [];
            const dataPoint = seriesData[dataPointIndex];

            if (!dataPoint) return '';

            const time = dataPoint.x;
            const users = dataPoint.users || [];

            // Only return the value if this time has actual timing entries, otherwise return empty string to hide label
            if (time !== undefined && users.length > 0) {
              return value;
            }
            return '';
          } catch (error) {
            return '';
          }
        },
        style: {
          colors: ['transparent'],
          fontSize: '12px',
          fontWeight: '700',
          fontFamily: 'inherit',
        },
        background: {
          enabled: true,
          borderColor: 'transparent',
          dropShadow: {
            enabled: true,
            top: 2,
            left: 2,
            blur: 4,
            opacity: 0.6,
            color: '#00D4FF',
          },
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 3,
          opacity: 0.5,
          color: '#00D4FF',
        },
        offsetY: -3,
        offsetX: 0,
      },
      tooltip: {
        ...lineChartOptionsDashboard2.tooltip,
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
          const time = data.x;
          const users = data.users || [];

          // Don't show tooltip for data points without timing entries
          if (users.length === 0) {
            return '';
          }

          let tooltipContent = `<div style="padding: 8px; background: #1a1a2e; color: white; border-radius: 4px;">`;
          tooltipContent += `<div style="font-weight: bold; margin-bottom: 6px;">Time: ${time}s</div>`;

          users.forEach(user => {
            tooltipContent += `<div style="margin: 2px 0;">${user?.altas}: ${user?.ticketCnt} tickets</div>`;
          });

          tooltipContent += `</div>`;
          return tooltipContent;
        },
      },
      xaxis: {
        ...lineChartOptionsDashboard2.xaxis,
        type: 'numeric', // Override datetime type to use numeric for time values
        min: 0,
        max: timeRange - 1,
        // title: {
        //   text: 'Time (seconds)',
        //   style: {
        //     color: '#c8cccf',
        //     fontSize: '12px',
        //   },
        // },
        labels: {
          style: {
            colors: '#c8cccf',
            fontSize: '12px',
          },
          formatter: function (value) {
            // Ensure we return a valid string, never undefined
            if (value === undefined || value === null || isNaN(value)) {
              return '';
            }
            return String(Math.round(value));
          },
        },
      },
      yaxis: {
        ...lineChartOptionsDashboard2.yaxis,
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          style: {
            colors: '#c8cfca',
            fontSize: '12px',
          },
          formatter: function (value) {
            return [0, 20, 40, 60, 80, 100].includes(value) ? value : '';
          },
        },
      },
    };
  }, [timing]);

  useAblyBetStart(handleBetEnd, true, level);

  useEffect(() => {
    setSoldTickets([]);
    setTicketOwners({});
  }, [props.value, setSoldTickets, setTicketOwners]);

  useEffect(() => {
    const key = remainingTimeStr[level];
    let startTime = sessionStorage.getItem(key);
    if (!startTime) {
      startTime = Date.now() - props.value.differenceTime;
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
      }
    }, 100);
    return () => clearInterval(interval);
  }, [props.value, level]);

  useEffect(() => {
    const fetchSoldTickets = async () => {
      try {
        if (!userAuthId) return;
        const data = await getSoldTickets({ betId: BET_ID, level }, history);

        setTiming(data.betTicket.timing);
        if (data?.soldTickets) {
          setSoldTickets(data.soldTickets.map(Number));
        }

        if (data?.ticketOwners) {
          const owners = {};
          Object.keys(data.ticketOwners).forEach((k) => {
            owners[Number(k)] = String(data.ticketOwners[k]);
          });
          setTicketOwners(owners);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSoldTickets();
  }, [BET_ID, level, userAuthId, setSoldTickets, setTicketOwners]);

  const sold = soldTickets?.length;
  const remaining = TOTAL_TICKETS - sold;
  const progress = Math.min(sold / TOTAL_TICKETS, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const handleClick = (isPlay) => {
    if (user?.membership === "free") {
      alert("Free users cannot access this page!");
      return;
    }
    setPlay(isPlay);
    onOpen();
  };

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <Grid>
      <Card>
        <CardHeader>
          <Text color="#00D4FF"
            fontWeight="bold" m="auto" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center">
            <PixIcon style={{ fontSize: "40px", color: "#00D4FF", marginRight: "8px" }} />Bet Chart
          </Text>
          <Box position="absolute" top="0px" right="2px" zIndex={2}>
            <IconButton
              aria-label="Help"
              icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
              size="md"
              bg="transparent"
              color="#00d4ff"
              borderRadius="50%"
              _hover={{ bg: 'rgba(255,255,255,0.1)', color: '#00D4FF' }}
              onClick={() => setIsHelpModalOpen(true)}
            />
          </Box>
        </CardHeader>
        <Grid templateColumns={{ sm: "1fr", lg: "1fr 2fr" }} py="40px">
          <GridItem justifyItems="center">
            <Grid
              templateColumns={{
                sm: "repeat(8, 1fr)",
                md: "repeat(10, 1fr)",
              }}
              w="245px"
              mt="45px"
              mb="45px"
              gap="5px"
              justifyItems="center"
            >
              {[...Array(100)].map((_, i) => i + 1).map((item, index) => {
                const isSold = soldTickets?.filter(ticket => ticket === item)?.length > 0;
                return (
                  <Badge
                    key={index}
                    textAlign="center"
                    lineHeight="20px"
                    width="20px"
                    height="20px"
                    fontSize="7px"
                    fontWeight="bold"
                    backgroundColor="transparent"
                    color={isSold ? "#00D4FF" : "gray.500"}
                    transform={isSold ? "scale(1.2)" : "scale(0.8)"}
                    style={{
                      animation: isSold ? "scaleBounce 0.8s ease-in-out" : "none",
                      textShadow: isSold ? "0 0 10px rgba(0, 212, 255, 0.3)" : "none",
                    }}
                  >
                    {item}
                  </Badge>
                );
              })}
            </Grid>
          </GridItem>
          <GridItem justifyItems="center" pb="0" w="100%">
            <Box w="490px" justifyItems="center">
              <Tooltip label={`Sold: ${sold} | Remaining: ${remaining}`}>
                <Box position="relative" w={`${SIZE}px`} h={`${SIZE}px`}>
                  <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <defs>
                      <linearGradient id="soldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00D4FF" />
                        <stop offset="100%" stopColor="#0066FF" />
                      </linearGradient>

                      <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <circle
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      stroke="#323738"
                      strokeWidth={STROKE}
                      fill="none"
                    />

                    <circle
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      stroke="url(#soldGradient)"
                      strokeWidth={STROKE}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={dashOffset}
                      filter="url(#glow)"
                      style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50% 50%",
                        transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
                        textShadow: "0 0 10px #00D4FF, 0 0 40px #00D4FF, 0 0 30px #00D4FF",
                      }}
                    />
                  </svg>
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    textAlign="center"
                  >
                    <Text
                      fontSize="48px"
                      color="#00D4FF"
                      fontWeight="bold"
                      style={{
                        textShadow: "0 0 0px #00D4FF, 0 0 0px #00D4FF, 0 0 20px #00D4FF"
                      }}
                    >
                      {sold}
                    </Text>

                    <Text color="#00D4FF" style={{ textShadow: "0 0 0 #00D4FF, 0 0 0 #00D4FF, 0 0 0 #00D4FF" }}>/ {TOTAL_TICKETS}</Text>
                    <Text fontSize="22px" color="#00D4FF" style={{
                      textShadow: "0 0 8px #00D4FF, 0 0 10px #00D4FF, 0 0 20px #00D4FF"
                    }}>
                      {(remainingTime / 1000).toFixed(1)}
                    </Text>
                  </Box>
                </Box>
              </Tooltip>
              <Flex justify="center" mt="-20px" gap="240px" w="100%">
                <Box>
                  <Button
                    onClick={() => handleClick(0)}
                    width="90px"
                    height="90px"
                    borderRadius="50%"
                    fontSize="20px"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    bg="#00D4FF"
                    color="white"
                    position="relative"
                    className="prebet-button"
                    _hover={{
                      bg: "white",
                      color: "#00D4FF",
                      transform: "scale(1.2)",
                      boxShadow: "0 0 20px #00f5ff"
                    }}
                    style={{
                      textShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 15px #00D4FF",
                      boxShadow: "0 0 10px #00f5ff"
                    }}
                  >
                    <PlayCircleRoundedIcon
                      style={{ fontSize: "80px" }}
                    />
                    <div className="neon-border"></div>
                    <div className="neon-dot neon-dot-1"></div>
                    <div className="neon-dot neon-dot-2"></div>
                    <div className="neon-dot neon-dot-3"></div>
                  </Button>
                  <Text
                    fontSize="2xl"
                    fontWeight="bold"
                    color="#00D4FF"
                    mt="3"
                    style={{
                      textShadow: "0 0 10px rgba(0, 212, 255, 0.5)",
                      textAlign: "center"
                    }}
                  >
                    Bet
                  </Text>
                </Box>
                <Box>
                  <Button
                    onClick={() => handleClick(1)}
                    width="90px"
                    height="90px"
                    borderRadius="50%"
                    fontSize="20px"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    bg="#00D4FF"
                    color="white"
                    position="relative"
                    className="prebet-button"
                    _hover={{
                      bg: "white",
                      color: "#00D4FF",
                      transform: "scale(1.2)",
                      boxShadow: "0 0 20px #00f5ff"
                    }}
                    style={{
                      textShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 15px #00D4FF",
                      boxShadow: "0 0 10px #00f5ff"
                    }}
                  >
                    <NotStartedRoundedIcon style={{ fontSize: "80px" }} />
                    <div className="neon-border"></div>
                    <div className="neon-dot neon-dot-1"></div>
                    <div className="neon-dot neon-dot-2"></div>
                    <div className="neon-dot neon-dot-3"></div>
                  </Button>
                  <Text
                    fontSize="2xl"
                    fontWeight="bold"
                    color="#00D4FF"
                    mt="3"
                    style={{
                      textShadow: "0 0 10px rgba(0, 212, 255, 0.5)",
                      textAlign: "center"
                    }}
                  >
                    Pre Bet
                  </Text>
                </Box>
              </Flex>
            </Box>
          </GridItem>
        </Grid>
        <Box height="300px" mt="-40px" mb="40px">
          <LineChart
            key={`chart-${timing?.length}`}
            lineChartData={chartData}
            lineChartOptions={chartOptions}
          />
        </Box>
        <Box justifyItems="center" position="absolute" right="5px" bottom="5px">
          <Tooltip label="Bet Graph" >
            <Button
              onClick={() => { handleClick(2) }}
              width="40px"
              height="40px"
              borderRadius="50%"
              display="flex"
              justifyContent="center"
              alignItems="center"
              bg="#00D4FF"
              color="white"
              position="relative"
              className="bet-graph-button"
              _hover={{
                bg: "white",
                color: "#00D4FF",
                transform: "scale(1.2)",
                boxShadow: "0 0 20px #00f5ff"
              }}
              style={{
                textShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 15px #00D4FF",
                boxShadow: "0 0 10px #00f5ff"
              }}
            >
              <AutoGraphIcon style={{ fontSize: "16px" }} />
              <div className="neon-border"></div>
              <div className="neon-dot neon-dot-1"></div>
              <div className="neon-dot neon-dot-2"></div>
              <div className="neon-dot neon-dot-3"></div>
            </Button>
          </Tooltip>
        </Box>
      </Card>

      {/* Help Modal */}
      <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
          <ModalHeader color="white" >
            *How to Play NumBanco Game
          </ModalHeader>
          <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
          <ModalBody py="0">
            <ModalBody py={4}>
              <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                <Text>
                  <strong>NumBanco Game</strong> is a number selection game where you choose any number between <strong>1 and 100</strong>.
                  The betting time is 30 seconds but if all tickets are sold before that, new game will start immediately.
                </Text>

                <Box>
                  <Text fontWeight="bold" color="#00D4FF" mb={2}>
                    Step 1: Choose Your Betting Tier
                  </Text>
                  <Text>Each tier has a different ticket price:</Text>
                  <UnorderedList pl={5} mt={2}>
                    <ListItem><strong>Tier A:</strong> $1 per ticket</ListItem>
                    <ListItem><strong>Tier B:</strong> $5 per ticket</ListItem>
                    <ListItem><strong>Tier C:</strong> $50 per ticket</ListItem>
                  </UnorderedList>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="#00D4FF" mb={2}>
                    Step 2: Select Your Number
                  </Text>
                  <Text>
                    Choose any number between <strong>1 and 100</strong>.
                    You can purchase multiple tickets to increase your winning chances.
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="#00D4FF" mb={2}>
                    *Prize Distribution (Per Tier)
                  </Text>

                  <UnorderedList pl={5}>
                    <ListItem>
                      <strong>1st Place:</strong> 16× ticket price — 1 winner
                      (Tier B: +$10 bonus, Tier C: +$150 bonus)
                    </ListItem>
                    <ListItem>
                      <strong>2nd Place:</strong> 8× ticket price — 2 winners
                    </ListItem>
                    <ListItem>
                      <strong>3rd Place:</strong> 4× ticket price — 3 winners
                    </ListItem>
                    <ListItem>
                      <strong>4th Place:</strong> 2× ticket price — 10 winners
                    </ListItem>
                    <ListItem>
                      <strong>5th Place:</strong> 1× ticket price — 20 winners
                    </ListItem>
                    <ListItem>
                      <strong>6th Place:</strong> 0.1× ticket price — 30 winners
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="#00D4FF" mb={2}>
                    *Pre Bet Option
                  </Text>
                  <Text>
                    If you want to secure your number before the betting starts, you can use the "Pre Bet" option.
                    This allows you to reserve your chosen number for the upcoming game, ensuring you don't miss out on your preferred selection.
                  </Text>
                </Box>

                <Text fontSize="xs" color="gray.400">
                  ⚠️ Higher tiers increase potential rewards but also require a higher ticket price.
                  Please play responsibly.
                </Text>

              </VStack>
            </ModalBody>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        top={play === 2 ? "15%" : "5%"}
        width={
          play === 0 && { sm: "90%", '2lg': "960px", '2xl': "1200px" } ||
          play === 1 && { sm: "90%", '2lg': "1280px", '2xl': "1600px" } ||
          play === 2 && { sm: "90%", '2lg': "1280px", '2xl': "1600px" }
        }
        isFooter
        content={
          play === 0 && <PlayBet betData={props.value} level={level} /> ||
          play === 1 && <PlayPrebet betData={props.value} level={level} /> ||
          play === 2 && <BetBalanceGraph />
        }
      />
      <style>
        {`
          /* Modern dataLabels styling */
          .apexcharts-datalabels-group .apexcharts-datalabel rect {
            rx: 50 !important;
            ry: 50 !important;
          }
          
          .apexcharts-datalabels-group .apexcharts-datalabel text {
            fill: #FFFFFF !important;
            font-weight: 700 !important;
            font-size: 12px !important;
          }

          @keyframes neonPulse {
            0% {
              box-shadow: 0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 20px #00D4FF;
            }
            50% {
              box-shadow: 0 0 10px #00D4FF, 0 0 15px #00D4FF, 0 0 30px #00D4FF;
            }
            100% {
              box-shadow: 0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 20px #00D4FF;
            }
          }

          .neon-border {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            box-sizing: border-box;
            border: 2px solid transparent;
            animation: neonGlow 1.5s infinite linear;
          }

          @keyframes neonGlow {
            0% {
              transform: rotate(0deg);
              border: 2px solid #00D4FF;
            }
            100% {
              transform: rotate(360deg);
              border: 2px solid #00D4FF;
            }
          }
            
          .neon-dot {
            position: absolute;
            top: 48%;
            left: 48%;
            width: 5px;
            height: 5px;
            background-color: white;    
            box-shadow: 0 0 15px #00D4FF, 0 0 30px #00D4FF, 0 0 60px #00D4FF;
            border-radius: 50%;
            transform-origin: 0 0;
            visibility: hidden; /* Initially hidden */
          }

          .bet-graph-button:hover .neon-dot,
          .bet-button:hover .neon-dot,
          .prebet-button:hover .neon-dot {
            visibility: visible; /* Make the dot visible on hover */
          }

          /* Different radius for each button */
          .bet-graph-button .neon-dot-1 {
            animation: moveDot1Graph 2s infinite linear, rainbow 5s infinite;
          }
          .bet-graph-button .neon-dot-2 {
            animation: moveDot2Graph 2s infinite linear, rainbow 5s infinite;
          }
          .bet-graph-button .neon-dot-3 {
            animation: moveDot3Graph 2s infinite linear, rainbow 5s infinite;
          }

          .bet-button .neon-dot-1 {
            animation: moveDot1Bet 2s infinite linear, rainbow 5s infinite;
          }
          .bet-button .neon-dot-2 {
            animation: moveDot2Bet 2s infinite linear, rainbow 5s infinite;
          }
          .bet-button .neon-dot-3 {
            animation: moveDot3Bet 2s infinite linear, rainbow 5s infinite;
          }

          .prebet-button .neon-dot-1 {
            animation: moveDot1Prebet 2s infinite linear, rainbow 5s infinite;
          }
          .prebet-button .neon-dot-2 {
            animation: moveDot2Prebet 2s infinite linear, rainbow 5s infinite;
          }
          .prebet-button .neon-dot-3 {
            animation: moveDot3Prebet 2s infinite linear, rainbow 5s infinite;
          }

          /* Bet Graph button - closest dots (25px) */
          @keyframes moveDot1Graph {
            0% {
              transform: rotate(0deg) translateX(25px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(25px) rotate(-360deg);
            }
          }

          @keyframes moveDot2Graph {
            0% {
              transform: rotate(120deg) translateX(25px) rotate(-120deg);
            }
            100% {
              transform: rotate(480deg) translateX(25px) rotate(-480deg);
            }
          }

          @keyframes moveDot3Graph {
            0% {
              transform: rotate(240deg) translateX(25px) rotate(-240deg);
            }
            100% {
              transform: rotate(600deg) translateX(25px) rotate(-600deg);
            }
          }

          /* Bet button - medium dots (35px) */
          @keyframes moveDot1Bet {
            0% {
              transform: rotate(0deg) translateX(35px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(35px) rotate(-360deg);
            }
          }

          @keyframes moveDot2Bet {
            0% {
              transform: rotate(120deg) translateX(35px) rotate(-120deg);
            }
            100% {
              transform: rotate(480deg) translateX(35px) rotate(-480deg);
            }
          }

          @keyframes moveDot3Bet {
            0% {
              transform: rotate(240deg) translateX(35px) rotate(-240deg);
            }
            100% {
              transform: rotate(600deg) translateX(35px) rotate(-600deg);
            }
          }

          /* Pre Bet button - farthest dots (45px) */
          @keyframes moveDot1Prebet {
            0% {
              transform: rotate(0deg) translateX(45px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(45px) rotate(-360deg);
            }
          }

          @keyframes moveDot2Prebet {
            0% {
              transform: rotate(120deg) translateX(45px) rotate(-120deg);
            }
            100% {
              transform: rotate(480deg) translateX(45px) rotate(-480deg);
            }
          }

          @keyframes moveDot3Prebet {
            0% {
              transform: rotate(240deg) translateX(45px) rotate(-240deg);
            }
            100% {
              transform: rotate(600deg) translateX(45px) rotate(-600deg);
            }
          }

          @keyframes scaleBounce {
            0% {
              transform: scale(0.8);
            }
            40% {
              transform: scale(1.8);
            }
            100% {
              transform: scale(1.2);
            }
          }

        `}
      </style>
    </Grid>
  );
}
