import {
  ChartsData,
  ChartType,
  GridChart,
  GridChartSection,
} from '@frontend/common';

type FieldData = { rawValues: string[]; displayValues: string[] };
type GridChartInput = Pick<
  GridChart,
  | 'tableName'
  | 'chartSections'
  | 'showLegend'
  | 'showVisualMap'
  | 'legendPosition'
  | 'chartOrientation'
  | 'chartType'
  | 'customSeriesColors'
  | 'selectedKeys'
> &
  Partial<GridChart>;

export function makeField(
  raw: (string | number)[],
  display: (string | number)[] = raw,
): FieldData {
  return { rawValues: raw.map(String), displayValues: display.map(String) };
}

export function makeChartsData(
  tableName: string,
  fields: Record<string, FieldData>,
): ChartsData {
  return {
    [tableName]: fields,
  } satisfies ChartsData;
}

const baseSectionDefaults = {
  xAxisFieldName: null,
  dotSizeFieldName: null,
  dotColorFieldName: null,
  histogramBucketsCount: null,
  histogramDataTableName: null,
} satisfies Partial<GridChartSection>;

export function makeGridChartSection(
  partial: Partial<GridChartSection> &
    Pick<GridChartSection, 'valueFieldNames'>,
): GridChartSection {
  return {
    ...baseSectionDefaults,
    ...partial,
  } satisfies GridChartSection;
}

export function makeHistogramSection(
  partial: Pick<
    GridChartSection,
    'histogramDataTableName' | 'histogramBucketsCount'
  > &
    Partial<GridChartSection>,
): GridChartSection {
  return {
    ...baseSectionDefaults,
    valueFieldNames: [],
    ...partial,
  } satisfies GridChartSection;
}

export function makeGridChart(
  input: Partial<GridChartInput> &
    Pick<GridChart, 'tableName' | 'chartSections'>,
): GridChart {
  return {
    tableName: input.tableName,
    chartSections: input.chartSections,
    showLegend: input.showLegend ?? true,
    showVisualMap: input.showVisualMap ?? false,
    legendPosition: input.legendPosition ?? 'bottom',
    chartOrientation: input.chartOrientation ?? 'horizontal',
    chartType: input.chartType ?? ChartType.LINE,
    selectedKeys: input.selectedKeys ?? {},
    customSeriesColors: input.customSeriesColors ?? {},
    startRow: 0,
    startCol: 0,
    endCol: 0,
    endRow: 0,
    tableStartCol: 0,
    tableStartRow: 0,
    availableKeys: {},
    selectorFieldNames: [],
    showTitle: true,
    keysWithNoDataPoint: {},
  } satisfies GridChart;
}

export function pickCommonOrganized(result: any) {
  return {
    xAxisData: result?.xAxisData,
    legendData: result?.legendData,
    series: Array.isArray(result?.series)
      ? result.series.map((s: any) => ({
          name: s?.name,
          type: s?.type,
          data: s?.data,
        }))
      : [],
  };
}
