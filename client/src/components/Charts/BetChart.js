import React from "react";
import ReactApexChart from "react-apexcharts";

class BetChart extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        chartData: [],
        chartOptions: {},
        };
    }

    componentDidMount() {
        const { betChartData, betChartOptions } = this.props;
        this.setState({
        chartData: betChartData,
        chartOptions: betChartOptions,
        });
    }

    render() {
        return (
        <ReactApexChart
            options={this.state.chartOptions}
            series={this.state.chartData}
            type='area'
            width='100%'
            height='100%'
        />
        );
    }
}

export default BetChart;