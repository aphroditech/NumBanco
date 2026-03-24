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
import axiosInstance from "../../../api/axiosConfig";
import StarRoundedIcon from '@mui/icons-material/Draw';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import { Flex, Text, Table, Thead, Tbody, Tr, Th, Td, Badge, Box, Input, IconButton, Button, HStack, Select } from "@chakra-ui/react";
import truncateToTwo from "variables/truncateToTwo";
import sadrabbit from '../../../assets/img/wolfnoavilable.png';
import { ZoomIn, ZoomOut } from '@mui/icons-material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useSelector } from "react-redux";
import GradientBorder from "components/GradientBorder/GradientBorder";
import wolfnoavilable from '../../../assets/img/wolfnoavilable.png';

// Suppress ResizeObserver warnings
const resizeObserverErrorHandler = (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    return;
  }
  console.error(e);
};


const PAGE_SIZE_OPTIONS = [5, 10, 20];
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

const getBadgeBgForTxnType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === "deposit") return "#2F855A";
  if (t === "withdraw") return "#C53030";
  if (t === "win") return "#2F855A"; // green
  if (t === "loss") return "#C53030"; // red
  return "#4A5568";
};

const SalesChart = ({ variant }) => {
  const isProfile = variant === 'profile';

  const [chartData, setChartData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [zoomDomain, setZoomDomain] = useState(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 300, height: 280 });
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const chartRef = useRef(null);
  const resizeRafRef = useRef(null);
  const lastSizeRef = useRef({ width: 0, height: 0 });
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
      const message = e?.message || "";
      if (message.includes("ResizeObserver loop completed with undelivered notifications")) {
        e.preventDefault?.();
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener("error", handler, true);
    return () => window.removeEventListener("error", handler, true);
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
          name: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), // Date only for chart labels
          tableDate: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), // Date only for table
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
  // Round domain to integers for natural numbers
  const yDomain = [Math.floor(yMin), Math.ceil(maxValue + padding)];

  // Get the data to display based on zoom
  const displayData = zoomDomain ? filteredChartData.slice(zoomDomain[0], zoomDomain[1] + 1) : filteredChartData;

  const chartMinWidth = 300;
  const chartMinHeight = isProfile ? 450 : 280;

  /** Recharts ResponsiveContainer needs positive px size; % height in flex often measures as -1. */
  useEffect(() => {
    if (!chartRef.current) {
      setIsContainerReady(false);
      return;
    }

    const minW = 300;
    const minH = isProfile ? 450 : 280;

    const updateDimensions = () => {
      const currentRef = chartRef.current;
      if (!currentRef) return;

      const rect = currentRef.getBoundingClientRect();
      const width = Math.floor(Math.max(rect.width || 0, minW));
      const height = Math.floor(Math.max(rect.height || 0, minH));
      const sizeChanged = width !== lastSizeRef.current.width || height !== lastSizeRef.current.height;

      if (width > 0 && height > 0) {
        if (sizeChanged) {
          lastSizeRef.current = { width, height };
          setContainerDimensions({ width, height });
        }
        setIsContainerReady(true);
      } else {
        setIsContainerReady(false);
      }
    };

    const observer = new ResizeObserver((entries) => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          const validWidth = Math.floor(Math.max(width || 0, minW));
          const validHeight = Math.floor(Math.max(height || 0, minH));
          const sizeChanged =
            validWidth !== lastSizeRef.current.width || validHeight !== lastSizeRef.current.height;

          if (validWidth > 0 && validHeight > 0) {
            if (sizeChanged) {
              lastSizeRef.current = { width: validWidth, height: validHeight };
              setContainerDimensions({ width: validWidth, height: validHeight });
            }
            setIsContainerReady(true);
          } else {
            setIsContainerReady(false);
          }
        }
      });
    });

    const currentRef = chartRef.current;
    observer.observe(currentRef);
    updateDimensions();
    const timeoutId1 = setTimeout(updateDimensions, 50);
    const timeoutId2 = setTimeout(updateDimensions, 200);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      observer.unobserve(currentRef);
    };
  }, [isProfile, filteredChartData.length]);

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
  const safePageSize = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(reversedTableData.length / safePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const startIdx = (currentPage - 1) * safePageSize;
  const paginatedData = reversedTableData.slice(startIdx, startIdx + safePageSize);
  const tableData = isProfile ? paginatedData : reversedTableData;

  useEffect(() => {
    if (isProfile) setTablePage(1);
  }, [filteredChartData.length, isProfile]);

  return (
    <Card
      p="16px"
      w="100%"
      h={isProfile ? undefined : '100%'}
      display="flex"
      flexDirection="column"
      minH={isProfile ? '400px' : { base: '500px', '2xl': '520px' }}
      minW={0}
      height={!isProfile ? '100%' : undefined}
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
          {/* Graph Section - Dashboard: fixed 50% height; Profile: flexible with min height */}
          <CardBody
            p="0"
            flex={isProfile ? undefined : '0 0 50%'}
            display="flex"
            flexDirection="column"
            minH={isProfile ? '500px' : '300px'}
            minW={0}
            overflow="hidden"
          >
            {filteredChartData.length > 0 &&
              <Box
                w="100%"
                maxW="100%"
                h="100%"
                flex={isProfile ? undefined : '1'}
                minH={`${chartMinHeight}px`}
                minW={0}
                position="relative"
                ref={chartRef}
              >
                {isContainerReady &&
                containerDimensions.width >= chartMinWidth &&
                containerDimensions.height >= chartMinHeight ? (
                <ResponsiveContainer
                  width={containerDimensions.width}
                  height={containerDimensions.height}
                  minWidth={0}
                  minHeight={chartMinHeight}
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
                      tickFormatter={(value) => Math.round(value).toString()}
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
                  <Flex align="center" justify="center" h="100%" minH={`${chartMinHeight}px`} color="gray.400">
                    <Text fontSize="sm">Loading chart…</Text>
                  </Flex>
                )}
              </Box>}
          </CardBody>

          {/* Transaction Table - Dashboard: fixed max height; Profile: no fixed height */}
          <CardBody
            p="16px"
            pt="0"
            display="flex"
            flexDirection="column"
            minH={isProfile ? undefined : '0'}
            maxH={!isProfile ? { base: '340px', md: '420px', '2xl': '460px' } : undefined}
          >
            <Box
              overflowX="auto"
              overflowY="auto"
              w="100%"
              minW={0}
              flex={isProfile ? undefined : '1'}
              minH={isProfile ? undefined : '0'}
              sx={{
                '&::-webkit-scrollbar': { width: '6px', height: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: '#555b5e', borderRadius: '8px' },
              }}
            >
              {filteredChartData.length > 0 && (
                <Table
                  variant="simple"
                  size="sm"
                  width="100%"
                  sx={{ tableLayout: "fixed" }}
                >
                  <Thead position="sticky" top="0" zIndex="100" bg="#323738">
                    <Tr>
                      <Th color="white" borderColor="#2d3748" bg="#323738" w="60px">Type</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738" w="85px">Game</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738" isNumeric w="82px">Amount</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738" isNumeric w="95px">Balance</Th>
                      <Th color="white" borderColor="#2d3748" bg="#323738" w="60px">Date</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {tableData.map((item, index) => {
                      const keyIndex = isProfile ? (currentPage - 1) * safePageSize + index : index;
                      const derivedType =
                        item.type === "deposit"
                          ? "Deposit"
                          : item.type === "withdraw"
                            ? "Withdraw"
                            : item.originalAmount > 0
                              ? "Win"
                              : "Loss";
                      return (
                        <Tr key={`${item.date}-${keyIndex}`}>
                          <Td borderColor="#56577A">
                            <Badge
                              variant="solid"
                              sx={{
                                bg: getBadgeBgForTxnType(derivedType),
                                color: "#FFFFFF",
                              }}
                            >
                              {derivedType}
                            </Badge>
                          </Td>
                          <Td borderColor="#56577A">
                            <Badge
                              variant="solid"
                              sx={{
                                bg: getBadgeBgForType(item.type),
                                color: "#FFFFFF",
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
                          <Td
                            color="#fff"
                            borderColor="#56577A"
                            fontSize="12px"
                            maxW="140px"
                            overflow="hidden"
                            whiteSpace="nowrap"
                            textOverflow="ellipsis"
                          >
                            {item.tableDate}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </Box>
            {isProfile && filteredChartData.length > 0 && (
              <Flex mt="3" justify="space-between" align="center" flexWrap="wrap" gap="16px">
                <Flex align="center" gap="12px" flexWrap="wrap">
                  <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)" whiteSpace="nowrap">
                    Items per page:
                  </Text>
                  <GradientBorder w="100px" borderRadius="20px">
                    <Select
                      color="white"
                      bg="#323738"
                      border="transparent"
                      borderRadius="20px"
                      fontSize="sm"
                      size="sm"
                      w="100px"
                      h="36px"
                      value={safePageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value) || DEFAULT_PAGE_SIZE;
                        setPageSize(newSize);
                        setTablePage(1);
                      }}
                      sx={{
                        option: { backgroundColor: "#323738", color: "white", padding: "8px 10px", fontSize: "14px" },
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Select>
                  </GradientBorder>
                </Flex>
                {totalPages > 1 && (
                  <>
                    <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)">
                      Showing {((currentPage - 1) * safePageSize) + 1} to {Math.min(currentPage * safePageSize, reversedTableData.length)} of {reversedTableData.length} results
                    </Text>
                    <HStack spacing="8px">
                      <Button
                        size="sm"
                        bg="#323738"
                        color="white"
                        _hover={{ bg: "#3d4243" }}
                        _active={{ bg: "#2a2d2e" }}
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        isDisabled={currentPage === 1}
                        leftIcon={<ChevronLeftIcon />}
                      >
                        Previous
                      </Button>
                      <HStack spacing="4px">
                        {(() => {
                          const pages = [];
                          const maxVisible = 7;
                          if (totalPages <= maxVisible) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            let startPage = Math.max(2, currentPage - 1);
                            let endPage = Math.min(totalPages - 1, currentPage + 1);
                            if (currentPage <= 3) endPage = Math.min(5, totalPages - 1);
                            if (currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 4);
                            if (startPage > 2) pages.push('ellipsis-start');
                            for (let i = startPage; i <= endPage; i++) pages.push(i);
                            if (endPage < totalPages - 1) pages.push('ellipsis-end');
                            pages.push(totalPages);
                          }
                          return pages.map((page, idx) => {
                            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                              return <Text key={`ellipsis-${idx}`} color="rgba(255, 255, 255, 0.5)" px="4px">...</Text>;
                            }
                            return (
                              <Button
                                key={page}
                                size="sm"
                                minW="36px"
                                h="36px"
                                bg={currentPage === page ? "#00D4FF" : "#323738"}
                                color="white"
                                _hover={{ bg: currentPage === page ? "#00b8e6" : "#3d4243" }}
                                _active={{ bg: currentPage === page ? "#00a3cc" : "#2a2d2e" }}
                                onClick={() => setTablePage(page)}
                              >
                                {page}
                              </Button>
                            );
                          });
                        })()}
                      </HStack>
                      <Button
                        size="sm"
                        bg="#323738"
                        color="white"
                        _hover={{ bg: "#3d4243" }}
                        _active={{ bg: "#2a2d2e" }}
                        onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                        isDisabled={currentPage === totalPages}
                        rightIcon={<ChevronRightIcon />}
                      >
                        Next
                      </Button>
                    </HStack>
                  </>
                )}
              </Flex>
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
            backgroundImage={`url(${wolfnoavilable})`}
            backgroundSize="contain"
            backgroundRepeat="no-repeat"
            backgroundPosition="center"
            w="220px"
            h="220px"
            opacity={0.85}
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