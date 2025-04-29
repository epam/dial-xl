import { EChartsOption } from 'echarts';

import { ChartsData, histogramChartSeriesSelector } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { getColor, getThemeColors } from '../common';

export function organizeHistogramChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const { gridChart } = chartConfig;
  const { chartSections, customSeriesColors, selectedKeys } = gridChart;
  const selectedSeries = selectedKeys[histogramChartSeriesSelector] as string;

  if (!chartSections || !chartSections.length || !selectedSeries) return;

  const histogramDataTableName = chartSections[0].histogramDataTableName;
  const bucketCount = chartSections[0].histogramBucketsCount;

  if (!histogramDataTableName || !bucketCount) return;

  const data = chartData[histogramDataTableName];

  if (!data || !Object.keys(data).length) return;

  const bucketNumbers = data['BucketNumber'];
  const lowerBounds = data['LowerBound'];
  const upperBounds = data['UpperBound'];
  const rowCounts = data['RowCount'];

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
  function getValue(value: number) {
    return value * zoom;
  }

  const fontSize = getValue(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);

  return {
    grid: {
      borderColor: '#ccc',
      left: getValue(20),
      top: getValue(20),
      right: getValue(10),
      bottom: getValue(20),
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        fontSize: getValue(10),
        color: textColor,
      },
    },
    yAxis: {
      type: 'value',
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        color: textColor,
        fontSize: getValue(10),
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
