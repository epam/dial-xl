import {
  BarChartIcon,
  FlatBarChartIcon,
  HeatmapChartIcon,
  HistogramChartIcon,
  LineChartIcon,
  PeriodSeriesChartIcon,
  PieChartIcon,
  ScatterPlotChartIcon,
  StackedBarChartIcon,
} from '../icons';
import { ChartType } from '../types';

export const chartItems = [
  {
    label: 'Line Chart',
    type: ChartType.LINE,
    value: ChartType.LINE,
    icon: <LineChartIcon />,
  },
  {
    label: 'Heatmap Chart',
    type: ChartType.HEATMAP,
    icon: <HeatmapChartIcon />,
  },
  {
    label: 'Scatter Plot Chart',
    type: ChartType.SCATTER_PLOT,
    icon: <ScatterPlotChartIcon />,
  },
  {
    label: 'Pie Chart',
    type: ChartType.PIE,
    icon: <PieChartIcon />,
  },
  {
    label: 'Bar Chart',
    type: ChartType.BAR,
    icon: <BarChartIcon />,
  },
  {
    label: '2d Bar Chart',
    type: ChartType.FLAT_BAR,
    icon: <FlatBarChartIcon />,
  },
  {
    label: 'Stacked Bar Chart',
    type: ChartType.STACKED_BAR,
    icon: <StackedBarChartIcon />,
  },
  {
    label: 'Histogram Chart',
    type: ChartType.HISTOGRAM,
    icon: <HistogramChartIcon />,
  },
  {
    label: 'Period Series Chart',
    type: ChartType.PERIOD_SERIES,
    icon: <PeriodSeriesChartIcon />,
  },
];
