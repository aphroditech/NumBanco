import { Box, Flex, Text } from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader.js';
import LineChart from 'components/Charts/LineChart';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { lineChartOptionsDashboard } from 'variables/charts';

export default function RubicBalanceGraph() {
    const user = useSelector((state) => state.user.userInfo);
    const [chartOptions, setChartOptions] = useState(null);

    const rubicHistory = user?.rubicHistory || [];

    useEffect(() => {
        if (rubicHistory.length > 0) {
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
                    categories: Array.from({ length: rubicHistory.length }, (_, i) => i + 1),
                    tickAmount: Math.min(14, rubicHistory.length),
                    labels: {
                        style: {
                            colors: '#c8cccf',
                            fontSize: '12px',
                        },
                        rotate: 0,
                        offsetY: 2,
                        hideOverlappingLabels: true,
                    },
                },
            };
            setChartOptions(newOptions);
        } else {
            setChartOptions({
                ...lineChartOptionsDashboard,
                xaxis: {
                    ...lineChartOptionsDashboard.xaxis,
                    categories: [],
                    tickAmount: 0,
                },
            });
        }
    }, [rubicHistory]);

    const betData = rubicHistory.map((item) =>
        item.betAmount != null ? Math.round(item.betAmount * 100) / 100 : 0
    );
    const winData = rubicHistory.map((item) =>
        item.profit != null ? Math.round(item.profit * 100) / 100 : 0
    );

    return (
        <Card>
            <CardHeader mb="20px" ps="22px">
                <Flex direction="column" alignSelf="flex-start">
                    <Text fontSize="lg" color="#fff" fontWeight="bold" mb="6px">
                        Rubic Balance Graph
                    </Text>
                </Flex>
            </CardHeader>
            <Box w="100%" minH={{ sm: '500px' }} h="500px" position="relative">
                {chartOptions && (
                    <LineChart
                        key={`${rubicHistory.length}`}
                        lineChartData={[
                            { name: 'Bet', data: betData },
                            { name: 'Win', data: winData },
                        ]}
                        lineChartOptions={{
                            ...chartOptions,
                            chart: {
                                ...chartOptions.chart,
                                width: '100%',
                                height: 450,
                            },
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
