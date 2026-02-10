import { EChartsOption } from 'echarts';

import {
  ChartsData,
  GridChart,
  histogramChartSeriesSelector,
} from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { getColor, getThemeColors } from '../common';

export function organizeHistogramChartData(
  chartData: ChartsData,
  gridChart: GridChart
): OrganizedData | undefined {
  const { chartSections, customSeriesColors, selectedKeys } = gridChart;
  const selectedSeries = selectedKeys[histogramChartSeriesSelector] as string;

  if (!chartSections || !chartSections.length || !selectedSeries) return;

  const histogramDataTableName = chartSections[0].histogramDataTableName;
  const bucketCount = chartSections[0].histogramBucketsCount;

  if (!histogramDataTableName || !bucketCount) return;

  const data = chartData[histogramDataTableName];

  if (!data || !Object.keys(data).length) return;

  const bucketNumbers = data['BucketNumber']?.rawValues;
  const lowerBounds = data['LowerBound']?.displayValues;
  const upperBounds = data['UpperBound']?.displayValues;
  const rowCounts = data['RowCount']?.rawValues;

  if (
    !bucketNumbers ||
    !lowerBounds ||
    !upperBounds ||
    !rowCounts ||
    !Array.isArray(bucketNumbers) ||
    !Array.isArray(lowerBounds) ||
    !Array.isArray(upperBounds) ||
    !Array.isArray(rowCounts)
  )
    return;

  const xAxisData = bucketNumbers.map(
    (_, i) => `${lowerBounds[i]} -\n ${upperBounds[i]}`
  );

  const series: EChartsOption['series'] = [
    {
      name: selectedSeries,
      type: 'bar',
      data: rowCounts as string[],
      itemStyle: {
        color: customSeriesColors?.[selectedSeries] || getColor(0),
      },
    },
  ];

  return {
    series,
    xAxisData,
  };
}

export function getHistogramChartOption({
  series,
  xAxisData,
  zoom,
  theme,
}: GetOptionProps): EChartsOption {
  function z(value: number) {
    return value * zoom;
  }

  const fontSize = z(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);

  const layout = buildLayout({
    zoom,
    textColor,
  });

  return {
    textStyle: {
      ...layout.textStyle,
    },
    grid: {
      ...layout.grid,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        fontSize: z(10),
        color: textColor,
      },
      axisTick: {
        alignWithLabel: true,
      },
    },
    yAxis: {
      type: 'value',
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        color: textColor,
        fontSize: z(10),
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
        },
      },
    },
    series,
    tooltip: {
      trigger: 'item',
      textStyle: {
        fontSize: Math.max(12, fontSize),
        color: textColor,
      },
      backgroundColor: bgColor,
      borderColor: borderColor,
    },
  };
}
