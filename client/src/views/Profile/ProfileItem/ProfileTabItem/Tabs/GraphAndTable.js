import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import CardBody from "components/Card/CardBody";
import axiosInstance from "../../../../../api/axiosConfig";
import StarRoundedIcon from '@mui/icons-material/Draw';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import { Flex, Text, Table, Thead, Tbody, Tr, Th, Td, Badge, Box, Input, IconButton, Button, HStack, Select } from "@chakra-ui/react";
import truncateToTwo from "variables/truncateToTwo";
import sadrabbit from '../../../../../assets/img/wolfnoavilable.png';
import { ZoomIn, ZoomOut } from '@mui/icons-material';

import { useSelector } from "react-redux";

// Suppress ResizeObserver warnings
const resizeObserverErrorHandler = (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    return;
  }
  console.error(e);
};


const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

// Badge colors: rubic/numexa/pumping/gravity = different; deposit & withdraw = same; all other = same
const getBadgeBgForType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'rubic') return '#805AD5';   // purple
  if (t === 'numexa') return '#DD6B20';   // orange
  if (t === 'pumping') return '#D53F8C';  // pink
  if (t === 'gravity') return '#00B5D8';  // cyan
  if (t === 'deposit' || t === 'withdraw') return '#3182CE'; // blue (same)
  return '#4A5568'; // gray for win, reward, bet, membership, etc.
};

const SalesChart = ({ variant }) => {
  const isProfile = variant === 'profile';

  const [chartData, setChartData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [zoomDomain, setZoomDomain] = useState(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 300, height: 250 });
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const chartRef = useRef(null);
  const user = useSelector((state) => state.user.userInfo) || {};
  const data = user?.totalhistory || [];
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  useEffect(() => {
    const handler = (e) => {
      if (
        e.message ===
        "ResizeObserver loop completed with undelivered notifications."
      ) {
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  // Transform totalhistory data for chart
  useEffect(() => {
    let isMounted = true;

    if (data && data.length > 0) {
      // Sort by date first
      const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningTotal = 0;
      const formattedData = sortedData.map((item, index) => {
        runningTotal += item.amount; // Add actual amount (positive or negative)
        const date = new Date(item.date);
        const value = parseFloat(runningTotal.toFixed(10)); // Ensure consistent precision
        return {
          index: index, // Use index as unique identifier
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + `.${date.getMilliseconds().toString().padStart(3, '0')}`, // Month, Day, Time with ms
          tableDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), // Clean date for table without ms
          value: value, // Use consistent precision
          type: item.type,
          originalAmount: item.amount,
          date: item.date,
        };
      });

      // Only update state if component is still mounted
      if (isMounted) {
        setChartData(formattedData);

        // Set initial dates for last 3 days if not already set
        if (!startDate && !endDate) {
          const today = new Date();
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 2); // Last 3 days (today + 2 days back)

          setEndDate(formatLocalDate(today));
          setStartDate(formatLocalDate(threeDaysAgo));
        }
      }
    }

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [data, startDate, endDate]);

  // Add ResizeObserver to track container dimensions
  useEffect(() => {
    if (!chartRef.current) return;

    const updateDimensions = () => {
      const currentRef = chartRef.current;
      if (!currentRef) return;

      const rect = currentRef.getBoundingClientRect();
      const width = Math.max(rect.width || 0, 300);
      const height = Math.max(rect.height || 0, 250);

      if (width > 0 && height > 0 && width >= 300 && height >= 250) {
        setContainerDimensions({ width, height });
        setIsContainerReady(true);
      } else {
        setIsContainerReady(false);
      }
    };

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const validWidth = Math.max(width || 0, 300);
        const validHeight = Math.max(height || 0, 250);

        if (validWidth > 0 && validHeight > 0 && validWidth >= 300 && validHeight >= 250) {
          setContainerDimensions({ width: validWidth, height: validHeight });
          setIsContainerReady(true);
        } else {
          setIsContainerReady(false);
        }
      }
    });

    const currentRef = chartRef.current;
    observer.observe(currentRef);

    // Set initial dimensions
    updateDimensions();

    // Fallback: update dimensions after delays to ensure layout is complete
    const timeoutId1 = setTimeout(updateDimensions, 50);
    const timeoutId2 = setTimeout(updateDimensions, 200);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [filteredChartData.length]);

  // Don't return null - always render the card structure
  // if (!chartData) return null;

  // Filter data based on date range
  const filteredChartData = (startDate && endDate && chartData)
    ? chartData.filter(item => {
      const itemDate = new Date(item.date);
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');

      return itemDate >= start && itemDate <= end;
    })
    : chartData || [];

  // Calculate Y-axis domain based on filtered data
  const values = filteredChartData.length > 0 ? filteredChartData.map(item => item.value) : [0, 100];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1; // 10% padding
  const rawMin = minValue - padding;
  const yMin = rawMin < 0 ? 0 : rawMin;
  const yDomain = [yMin, maxValue + padding];

  // Get the data to display based on zoom
  const displayData = zoomDomain ? filteredChartData.slice(zoomDomain[0], zoomDomain[1] + 1) : filteredChartData;

  // Handle zoom in button click
  const handleZoomIn = () => {
    if (!filteredChartData.length) return;

    const currentIndex = zoomDomain ? Math.floor((zoomDomain[0] + zoomDomain[1]) / 2) : Math.floor(filteredChartData.length / 2);
    const zoomFactor = 0.2; // Zoom in by 20%
    const minZoom = 5; // Minimum number of points to show

    let newStartIndex, newEndIndex;

    if (zoomDomain) {
      const currentRange = zoomDomain[1] - zoomDomain[0] + 1;
      const newRange = Math.max(minZoom, Math.floor(currentRange * (1 - zoomFactor)));
      const centerIndex = zoomDomain[0] + Math.floor((zoomDomain[1] - zoomDomain[0]) / 2);
      newStartIndex = Math.max(0, centerIndex - Math.floor(newRange / 2));
      newEndIndex = Math.min(filteredChartData.length - 1, newStartIndex + newRange - 1);
    } else {
      const currentRange = filteredChartData.length;
      const newRange = Math.max(minZoom, Math.floor(currentRange * (1 - zoomFactor)));
      newStartIndex = Math.max(0, currentIndex - Math.floor(newRange / 2));
      newEndIndex = Math.min(filteredChartData.length - 1, newStartIndex + newRange - 1);
    }

    setZoomDomain([newStartIndex, newEndIndex]);
  };

  // Handle zoom out button click
  const handleZoomOut = () => {
    if (!filteredChartData.length || !zoomDomain) return;

    const zoomFactor = 0.2; // Zoom out by 20%
    const currentRange = zoomDomain[1] - zoomDomain[0] + 1;
    const newRange = Math.min(filteredChartData.length, Math.floor(currentRange * (1 + zoomFactor)));
    const centerIndex = zoomDomain[0] + Math.floor((zoomDomain[1] - zoomDomain[0]) / 2);
    const newStartIndex = Math.max(0, centerIndex - Math.floor(newRange / 2));
    const newEndIndex = Math.min(filteredChartData.length - 1, newStartIndex + newRange - 1);

    // Reset zoom if we're showing almost everything
    if (newEndIndex - newStartIndex + 1 >= filteredChartData.length - 2) {
      setZoomDomain(null);
    } else {
      setZoomDomain([newStartIndex, newEndIndex]);
    }
  };

  const reversedTableData = filteredChartData.length > 0 ? [...filteredChartData].reverse() : [];
  const totalPages = Math.max(1, Math.ceil(reversedTableData.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const paginatedData = reversedTableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setTablePage(1);
  }, [filteredChartData.length]);

  return (
    <Card p="16px" w="100%" h="100%" display="flex" flexDirection="column" minH="500"
      height={isProfile
        ? { sm: "375px", md: "1476px", lg: "1512px", '1115px': '795px' }
        : { sm: "250px", md: "984px", lg: "1008px", '1115px': '530px' }
      }
    >
      <CardHeader
        p="0px 0px 0px 0px"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Flex align="center" gap="10px">
          <AutoGraphIcon
            style={{
              fontSize: "30px",
              color: "#00D4FF",
              marginRight: "8px",

            }} />
          <Text color="#00D4FF"
            fontWeight="bold" fontSize="25px">
            Balance
          </Text>
          <Flex align="right" gap="8px" ml="20px" justifyContent="flex-end" position="fixed" right="20px" mb="10px">
            <Box>
              <Text color="gray.400" fontSize="11px" mb={1}>From</Text>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                bg="#1a202c"
                color="#fff"
                borderColor="#2d3748"
                w="130px"
                size="xs"
              />
            </Box>
            <Box>
              <Text color="gray.400" fontSize="11px" mb={1}>To</Text>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                bg="#1a202c"
                color="#fff"
                borderColor="#2d3748"
                w="130px"
                size="xs"
              />
            </Box>
          </Flex>
        </Flex>
      </CardHeader>
      {filteredChartData.length > 0 ? (
        <>
          {/* Graph Section - 50% height */}
          <CardBody p="0" flex="0 0 50%" display="flex" flexDirection="column" minH="250px" overflow="hidden">
            {filteredChartData.length > 0 &&
              <Box
                w="100%"
                h="100%"
                flex="1"
                minHeight="250px"
                minWidth="300px"
                position="relative"
                ref={chartRef}
              >
                {isContainerReady && containerDimensions.width >= 300 && containerDimensions.height >= 250 ? (
                  <ResponsiveContainer
                    width={containerDimensions.width}
                    height={containerDimensions.height}
                    minWidth={300}
                    minHeight={250}
                    key={`chart-${containerDimensions.width}-${containerDimensions.height}`}
                  >
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                      <XAxis
                        dataKey="name"
                        stroke="#fff"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#fff"
                        style={{ fontSize: '12px' }}
                        domain={yDomain}
                        allowDataOverflow={true}
                        tickFormatter={(value) => truncateToTwo(value)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a202c',
                          border: '1px solid #2d3748',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#00D4FF' }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const { name } = payload[0].payload;
                            return name;
                          }
                          return label;
                        }}
                        formatter={(value, name, props) => {
                          const { originalAmount, type, date, value: balance } = props.payload;
                          return [
                            `Balance: $${truncateToTwo(Number(balance))}`,
                            `Transaction: ${originalAmount > 0 ? '+' : '-'}$${truncateToTwo(Math.abs(originalAmount))} (${type})`,
                          ];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ color: '#fff' }}
                        content={() => (
                          <Flex align="center" gap="4" justify="center">
                            <IconButton
                              icon={<ZoomOut />}
                              size="xs"
                              variant="ghost"
                              color="gray.400"
                              _hover={{ color: "#00D4FF" }}
                              onClick={handleZoomOut}
                              isDisabled={!zoomDomain}
                              aria-label="Zoom out"
                            />
                            <IconButton
                              icon={<ZoomIn />}
                              size="xs"
                              variant="ghost"
                              color="gray.400"
                              _hover={{ color: "#00D4FF" }}
                              onClick={handleZoomIn}
                              isDisabled={zoomDomain && (zoomDomain[1] - zoomDomain[0] + 1) <= 5}
                              aria-label="Zoom in"
                            />
                          </Flex>
                        )}
                      />
                      <Line
                        key="force-rerender"
                        dataKey="value"
                        stroke="#00D4FF"
                        dot={false}
                        name="Amount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Flex align="center" justify="center" h="100%" minH="250px" color="gray.400">
                    <Text>Loading chart...</Text>
                  </Flex>
                )}
              </Box>}
          </CardBody>

          {/* Transaction Table - more height when profile; with pagination */}
          <CardBody p="16px" pt="0" display="flex" flexDirection="column" minH="0"
            maxH={isProfile
              ? { sm: "525px", md: "825px", '1115px': '675px' }
              : { sm: "350px", md: "550px", '1115px': '450px' }
            }
          >
            <Box overflowX="auto" w="100%" flex="1" minH="0"
              sx={{
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": { background: "#555b5e", borderRadius: "8px" },
              }}>
              {filteredChartData.length > 0 && (
                <Table variant="simple" size="sm">
                  <Thead position="sticky" top="0" zIndex="100" bg="#323738">
                    <Tr>
                      <Th color="white" borderColor="#2d3748" bg="#323738">Type</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738" isNumeric>Amount</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738" isNumeric>Balance</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738">Time</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paginatedData.map((item, index) => {
                      const globalIndex = (currentPage - 1) * pageSize + index;
                      return (
                        <Tr key={`${item.date}-${globalIndex}`}>
                          <Td borderColor="#56577A">
                            <Badge
                              variant="solid"
                              sx={{
                                bg: getBadgeBgForType(item.type),
                                color: '#FFFFFF',
                              }}
                            >
                              {item.type}
                            </Badge>
                          </Td>
                          <Td color={item.originalAmount > 0 ? '#68d391' : '#fc8181'} borderColor="#56577A" isNumeric fontSize="12px">
                            {item.originalAmount > 0 ? '+' : '-'}${truncateToTwo(Math.abs(item.originalAmount))}
                          </Td>
                          <Td color="#fff" borderColor="#56577A" isNumeric fontSize="12px">
                            {item.value > 0 ? `$${truncateToTwo(item.value)}` : `-$${truncateToTwo(Math.abs(item.value))}`}
                          </Td>
                          <Td color="#fff" borderColor="#56577A" fontSize="12px" whiteSpace="nowrap">
                            {item.tableDate}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </Box>
            {filteredChartData.length > 0 && totalPages > 0 && (
              <HStack mt="3" justify="space-between" flexWrap="wrap" gap="2">
                <HStack>
                  <Text color="gray.400" fontSize="sm">Rows per page:</Text>
                  <Select
                    size="sm"
                    w="70px"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setTablePage(1); }}
                    bg="#1a202c"
                    color="#fff"
                    borderColor="#2d3748"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </HStack>
                <HStack gap="2">
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="cyan"
                    isDisabled={currentPage <= 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Text color="gray.400" fontSize="sm" whiteSpace="nowrap">
                    Page {currentPage} of {totalPages}
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="cyan"
                    isDisabled={currentPage >= totalPages}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </HStack>
              </HStack>
            )}
          </CardBody>
        </>
      ) : (
        <Flex
          flex="1"
          direction="column"
          align="center"
          justify="center"
          minH="400px"
          color="white"
        >
          <Box
            backgroundImage={`url(${sadrabbit})`}
            backgroundSize="contain"
            backgroundRepeat="no-repeat"
            backgroundPosition="center"
            w="220px"
            h="220px"
            opacity={0.85}
            mb="20px"
          />
          <Flex align="center" justify="center" mb="20px">
            <SpeakerNotesOffRoundedIcon
              style={{
                fontSize: "20px",
                color: "white",
                marginRight: "8px",

              }} />
            No history found
          </Flex>
        </Flex>
      )}

    </Card>
  );
};

export default SalesChart;