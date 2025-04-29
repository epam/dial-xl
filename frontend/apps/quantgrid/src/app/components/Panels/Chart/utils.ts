import { ChartType } from '@frontend/common';

export const chartsWithoutLegend: ChartType[] = [
  ChartType.HISTOGRAM,
  ChartType.HEATMAP,
];

export const chartsWithoutXAxis: ChartType[] = [
  ChartType.PIE,
  ChartType.BAR,
  ChartType.HISTOGRAM,
  ChartType.PERIOD_SERIES,
];

export const chartsWithSeparators: ChartType[] = [
  ChartType.LINE,
  ChartType.SCATTER_PLOT,
];

export enum CollapseSection {
  Title = 'title',
  ChartType = 'chartType',
  Selectors = 'selectors',
  SizeLocation = 'sizeLocation',
  Series = 'series',
  Data = 'data',
  XAxis = 'xAxis',
}
