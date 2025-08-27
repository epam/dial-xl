import { EChartsOption } from 'echarts';

import { AppTheme, ChartsData, ChartType } from '@frontend/common';

import { ChartConfig } from '../types';
import {
  getBarChartOption,
  getFlatBarChartOption,
  getHeatMapChartOption,
  getHistogramChartOption,
  getLineChartOption,
  getPeriodSeriesChartOption,
  getPieChartOption,
  getScatterPlotChartOption,
  getStackedBarChartOption,
  organizeBarChartData,
  organizeFlatBarChartData,
  organizeHeatMapChartData,
  organizeHistogramChartData,
  organizeLineChartData,
  organizePeriodSeriesChartData,
  organizePieChartData,
  organizeScatterPlotChartData,
  organizeStackedBarChartData,
} from './chartOptions';

export interface OrganizedData {
  legendData?: string[];
  xAxisData?: string[];
  yAxisData?: string[];
  series?: EChartsOption['series'];
  seriesData?: Array<[number, number, number | null, string]>;
  visualMapMax?: number;
  showLegend?: boolean;
  isHorizontal?: boolean;
}

type OrganizeDataFn = (
  data: ChartsData,
  config: ChartConfig
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
  isHorizontal?: boolean;
};

type GetOptionFn = (options: GetOptionProps) => EChartsOption;

interface ChartBuilder {
  organizeData: OrganizeDataFn;
  getOption: GetOptionFn;
}

export const chartRegistry: Record<ChartType, ChartBuilder> = {
  [ChartType.BAR]: {
    organizeData: organizeBarChartData,
    getOption: getBarChartOption,
  },
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
    organizeData: organizeStackedBarChartData,
    getOption: getStackedBarChartOption,
  },
  [ChartType.FLAT_BAR]: {
    organizeData: organizeFlatBarChartData,
    getOption: getFlatBarChartOption,
  },
  [ChartType.HEATMAP]: {
    organizeData: organizeHeatMapChartData,
    getOption: getHeatMapChartOption,
  },
};
