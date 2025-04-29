import { EChartsOption } from 'echarts';

import { chartRowNumberSelector, ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  sortNumericOrText,
} from '../common';

export function organizeBarChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const data = chartData[chartConfig.tableName];
  const { gridChart } = chartConfig;
  const { chartSections, customSeriesColors, selectedKeys, showLegend } =
    gridChart;

  if (
    !data ||
    !Object.keys(data).length ||
    !chartSections ||
    !chartSections.length
  )
    return;

  const rowNumber = selectedKeys[chartRowNumberSelector];

  if (typeof rowNumber !== 'string') return;

  const rowIndex = parseInt(rowNumber, 10) - 1;
  if (isNaN(rowIndex) || rowIndex < 0) return;

  const dataKeys = Object.keys(data);
  const totalDataKeys = dataKeys.length;
  if (totalDataKeys === 0) return;

  const legendData: string[] = [];
  const xAxisData: string[] = [];
  const series: EChartsOption['series'] = [];
  const valueFieldNames = chartSections[0].valueFieldNames;
  const sortedDataKeys = sortNumericOrText(valueFieldNames);

  for (const key of sortedDataKeys) {
    const value = data[key];

    if (!Array.isArray(value)) {
      return;
    }

    if (rowIndex >= value.length) {
      return;
    }

    legendData.push(key);
    xAxisData.push(key);

    const seriesData = Array.from({ length: totalDataKeys }).fill(null);
    const rawValue = value[rowIndex];
    const numericValue = parseFloat(rawValue as string);

    seriesData[legendData.length - 1] = isNaN(numericValue)
      ? null
      : numericValue;

    const colorIndex = legendData.length - 1;
    series.push({
      name: key,
      type: 'bar',
      stack: 'stack',
      data: seriesData as number[],
      itemStyle: {
        color: customSeriesColors?.[key] || getColor(colorIndex, key),
      },
    });
  }

  return {
    showLegend,
    legendData,
    series,
    xAxisData: addLineBreaks(sortNumericOrText(xAxisData)),
  };
}

export function getBarChartOption({
  series,
  xAxisData,
  legendData,
  zoom,
  theme,
  showLegend,
}: GetOptionProps): EChartsOption {
  function getValue(value: number) {
    return value * zoom;
  }

  const fontSize = getValue(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);

  return {
    legend: {
      type: 'scroll',
      orient: 'vertical',
      left: 0,
      top: getValue(10),
      bottom: getValue(10),
      itemWidth: getValue(20),
      itemHeight: getValue(10),
      data: legendData,
      textStyle: {
        fontSize,
        color: textColor,
        overflow: 'break',
        width: getValue(70),
      },
      show: showLegend,
    },
    grid: {
      borderColor: '#ccc',
      left: showLegend ? getValue(130) : getValue(10),
      top: getValue(20),
      right: getValue(10),
      bottom: getValue(20),
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        show: false,
        fontSize,
      },
    },
    yAxis: {
      type: 'value',
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        color: textColor,
        fontSize,
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
