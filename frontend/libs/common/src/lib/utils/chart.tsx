import {
  ClusteredBarChartIcon,
  ClusteredColumnChartIcon,
  HeatmapChartIcon,
  HistogramChartIcon,
  LineChartIcon,
  PeriodSeriesChartIcon,
  PieChartIcon,
  ScatterPlotChartIcon,
  StackedBarChartIcon,
  StackedColumnChartIcon,
} from '../icons';
import { ChartType } from '../types';

export const chartItems = [
  {
    label: 'Line',
    type: ChartType.LINE,
    value: ChartType.LINE,
    icon: <LineChartIcon />,
  },
  {
    label: 'Heatmap',
    type: ChartType.HEATMAP,
    icon: <HeatmapChartIcon />,
  },
  {
    label: 'Scatter Plot',
    type: ChartType.SCATTER_PLOT,
    icon: <ScatterPlotChartIcon />,
  },
  {
    label: 'Pie',
    type: ChartType.PIE,
    icon: <PieChartIcon />,
  },
  {
    label: 'Clustered Column',
    type: ChartType.CLUSTERED_COLUMN,
    icon: <ClusteredColumnChartIcon />,
  },
  {
    label: 'Stacked Column',
    type: ChartType.STACKED_COLUMN,
    icon: <StackedColumnChartIcon />,
  },
  {
    label: 'Clustered Bar',
    type: ChartType.CLUSTERED_BAR,
    icon: <ClusteredBarChartIcon />,
  },
  {
    label: 'Stacked Bar',
    type: ChartType.STACKED_BAR,
    icon: <StackedBarChartIcon />,
  },
  {
    label: 'Histogram',
    type: ChartType.HISTOGRAM,
    icon: <HistogramChartIcon />,
  },
  {
    label: 'Period Series',
    type: ChartType.PERIOD_SERIES,
    icon: <PeriodSeriesChartIcon />,
  },
];
