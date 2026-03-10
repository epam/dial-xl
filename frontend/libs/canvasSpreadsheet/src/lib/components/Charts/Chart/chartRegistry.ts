import { EChartsOption } from 'echarts';

import {
  AppTheme,
  ChartLegendPosition,
  ChartOrientation,
  ChartsData,
  ChartType,
  GridChart,
} from '@frontend/common';

import {
  getBarChartOption,
  getHeatMapChartOption,
  getHistogramChartOption,
  getLineChartOption,
  getPeriodSeriesChartOption,
  getPieChartOption,
  getScatterPlotChartOption,
  organizeBarChartData,
  organizeHeatMapChartData,
  organizeHistogramChartData,
  organizeLineChartData,
  organizePeriodSeriesChartData,
  organizePieChartData,
  organizeScatterPlotChartData,
} from './chartOptions';

export interface OrganizedData {
  legendData?: string[];
  xAxisData?: string[];
  yAxisData?: string[];
  series?: EChartsOption['series'];
  seriesData?: Array<[number, number, number | null, string]>;
  visualMapMax?: number;
  showLegend?: boolean;
  showVisualMap?: boolean;
  isHorizontal?: boolean;
  isNumericXAxis?: boolean;
  orientation?: ChartOrientation;
  legendPosition?: ChartLegendPosition;
}

type OrganizeDataFn = (
  data: ChartsData,
  gridChart: GridChart,
) => OrganizedData | undefined;

export type GetOptionProps = {
  theme: AppTheme;
  zoom: number;
  legendData?: string[];
  xAxisData?: string[];
  yAxisData?: string[];
  series?: EChartsOption['series'];
  seriesData?: Array<[number, number, number | null, string]>;
  visualMapMax?: number;
  showLegend?: boolean;
  showVisualMap?: boolean;
  isHorizontal?: boolean;
  isNumericXAxis?: boolean;
  orientation?: ChartOrientation;
  legendPosition?: ChartLegendPosition;
};

type GetOptionFn = (options: GetOptionProps) => EChartsOption;

interface ChartBuilder {
  organizeData: OrganizeDataFn;
  getOption: GetOptionFn;
}

export const chartRegistry: Record<ChartType, ChartBuilder> = {
  [ChartType.LINE]: {
    organizeData: organizeLineChartData,
    getOption: getLineChartOption,
  },
  [ChartType.HISTOGRAM]: {
    organizeData: organizeHistogramChartData,
    getOption: getHistogramChartOption,
  },
  [ChartType.PERIOD_SERIES]: {
    organizeData: organizePeriodSeriesChartData,
    getOption: getPeriodSeriesChartOption,
  },
  [ChartType.PIE]: {
    organizeData: organizePieChartData,
    getOption: getPieChartOption,
  },
  [ChartType.SCATTER_PLOT]: {
    organizeData: organizeScatterPlotChartData,
    getOption: getScatterPlotChartOption,
  },
  [ChartType.STACKED_BAR]: {
    organizeData: organizeBarChartData,
    getOption: getBarChartOption,
  },
  [ChartType.CLUSTERED_BAR]: {
    organizeData: organizeBarChartData,
    getOption: getBarChartOption,
  },
  [ChartType.CLUSTERED_COLUMN]: {
    organizeData: organizeBarChartData,
    getOption: getBarChartOption,
  },
  [ChartType.STACKED_COLUMN]: {
    organizeData: organizeBarChartData,
    getOption: getBarChartOption,
  },
  [ChartType.HEATMAP]: {
    organizeData: organizeHeatMapChartData,
    getOption: getHeatMapChartOption,
  },
};
