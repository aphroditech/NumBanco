import {
	Box,
	Flex,
	Text,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader.js';
import LineChart from 'components/Charts/LineChart';
import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
	lineChartOptionsDashboard
} from 'variables/charts';

export default function PumpingBalanceGraph() {
    const user = useSelector((state) => state.user.userInfo);
    const [chartOptions, setChartOptions] = useState(null);

    const pumpingHistory = user?.pumpingHistory || [];

    // Helper function to format number with up to 4 decimal places, removing trailing zeros
    const formatToFixed4 = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        // Format to 4 decimal places and remove trailing zeros
        return num.toFixed(4).replace(/\.?0+$/, '');
    };

    useEffect(() => {
        if (pumpingHistory.length > 0) {
            const newOptions = {
                ...lineChartOptionsDashboard,
                chart: {
                    ...lineChartOptionsDashboard.chart,
                    type: 'area',
                    zoom: {
                        enabled: true,
                        autoScaleYaxis: true,
                    },
                },
                stroke: {
                    curve: "smooth",
                    width: 3, // Thicker, more prominent lines
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shade: "dark",
                        type: "vertical",
                        shadeIntensity: 0.5,
                        gradientToColors: undefined,
                        inverseColors: false,
                        opacityFrom: 0.6,
                        opacityTo: 0.1,
                        stops: [0, 100],
                    },
                },
                colors: ["#f8285a", "#17c653"], // Vibrant pink/red for Bet, green for Win
                markers: {
                    size: 0, // Hide markers for cleaner line look
                },
                yaxis: {
                    ...lineChartOptionsDashboard.yaxis,
                    min: 0,
                    labels: {
                        ...lineChartOptionsDashboard.yaxis.labels,
                        formatter: (val) => {
                            return formatToFixed4(val);
                        }
                    }
                },
                tooltip: {
                    ...lineChartOptionsDashboard.tooltip,
                    y: {
                        formatter: (val) => {
                            return formatToFixed4(val);
                        }
                    }
                },
                xaxis: {
                    ...lineChartOptionsDashboard.xaxis,
                    categories: Array.from({ length: pumpingHistory.length }, (_, i) => i + 1),
                    tickBet: Math.min(14, pumpingHistory.length),
                    labels: {
                        style: {
                            colors: "#c8cccf",
                            fontSize: "12px",
                        },
                        rotate: 0,
                        offsetY: 2,
                        hideOverlappingLabels: true
                    }
                }
            };
            setChartOptions(newOptions);
        } else {
            setChartOptions({
                ...lineChartOptionsDashboard,
                xaxis: {
                    ...lineChartOptionsDashboard.xaxis,
                    categories: [],
                    tickBet: 0
                }
            });
        }
    }, [pumpingHistory]);
	return (
        <Card>
            <CardHeader mb='20px' ps='22px'>
                <Flex direction='column' alignSelf='flex-start'>
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px'>
                        Pumping Balance Graph
                    </Text>
                </Flex>
            </CardHeader>
            <Box w='100%' minH={{ sm: '500px' }} h='500px' position='relative'>
               {chartOptions && (
                    <LineChart
                        key={`${pumpingHistory.length}`}
                        lineChartData={[
                            {
                                name: 'Bet',
                                data: pumpingHistory.filter(item => item.bet !== null).map(item => parseFloat(item.bet)) || [],
                            },
                            {
                                name: 'Win',
                                data: pumpingHistory.filter(item => item.win !== null).map(item => parseFloat(item.win)) || [],
                            },
                        ]}
                        lineChartOptions={{
                            ...chartOptions,
                            chart: {
                                ...chartOptions.chart,
                                width: '100%',
                                height: 450
                            }
                        }}
                    />
               )}
            </Box>
        <style>
            {`
            .apexcharts-disable-transitions text {
                transition: none !important;
                transform: rotate(0deg)!important;
            }
            `}
        </style>
        </Card>
	);
}
