import React from "react";
import ReactApexChart from "react-apexcharts";

class LineChart extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        chartData: [],
        chartOptions: {},
        };
    }

    componentDidMount() {
        const { profilChartData, profilChartOptions } = this.props;

        this.setState({
        chartData: profilChartData,
        chartOptions: profilChartOptions,
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

export default LineChart;