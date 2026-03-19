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

export default function BetBalanceGraph() {
    const user = useSelector((state) => state.user.userInfo);
    const [chartOptions, setChartOptions] = useState(null);
    const [tierFilters, setTierFilters] = useState({
        tierA: true,
        tierB: true,
        tierC: true
    });

    const filteredHistory = useMemo(() => {
        return user?.bethistory?.filter(item => {
            if (item.betId === null) return false;
            if (item.tier === 0 && !tierFilters.tierA) return false;
            if (item.tier === 1 && !tierFilters.tierB) return false;
            if (item.tier === 2 && !tierFilters.tierC) return false;
            return true;
        }) || [];
    }, [user?.bethistory, tierFilters]);

    useEffect(() => {
        if (filteredHistory.length > 0) {
            const betIds = filteredHistory
                .map(item => item.tier === 0 ? 'Tier A ' + item.betId : item.tier === 1 ? 'Tier B ' + item.betId : 'Tier C ' + item.betId);
            
            const newOptions = {
                ...lineChartOptionsDashboard,
                chart: {
                    ...lineChartOptionsDashboard.chart,
                    zoom: {
                        enabled: true,
                        autoScaleYaxis: true,
                    },
                },
                yaxis: {
                    ...lineChartOptionsDashboard.yaxis,
                    min: 0,
                },
                xaxis: {
                    ...lineChartOptionsDashboard.xaxis,
                    categories: betIds,
                    tickAmount: Math.min(14, betIds.length),
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
                    tickAmount: 0
                }
            });
        }
    }, [filteredHistory]);
	return (
        <Card>
            <CardHeader mb='20px' ps='22px'>
                <Flex direction='column' alignSelf='flex-start'>
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px'>
                        Bet Balance Graph
                    </Text>
                </Flex>
            </CardHeader>
            <Box w='100%' minH={{ sm: '500px' }} h='500px' position='relative'>
               {chartOptions && (
                    <LineChart
                        key={`${filteredHistory.length}-${JSON.stringify(tierFilters)}`}
                        lineChartData={[
                            {
                                name: 'Bet',
                                data: filteredHistory.filter(item => item.bet !== null).map(item => Math.round(item.bet * 10) / 10) || [],
                            },
                            {
                                name: 'Win',
                                data: filteredHistory.filter(item => item.win !== null).map(item => Math.round(item.win * 10) / 10) || [],
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
