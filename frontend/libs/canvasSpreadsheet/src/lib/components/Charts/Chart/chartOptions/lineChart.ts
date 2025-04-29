import { EChartsOption } from 'echarts';

import { ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  sortNumericOrText,
} from '../common';

export function organizeLineChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const data = chartData[chartConfig.tableName];
  const { gridChart } = chartConfig;
  const { chartSections, customSeriesColors, showLegend } = gridChart;

  if (
    !data ||
    !Object.keys(data).length ||
    !chartSections ||
    !chartSections.length
  )
    return;

  const legendData: string[] = [];
  const xAxisValuesSet: Set<string> = new Set();
  const series: EChartsOption['series'] = [];

  // Gather all unique x-axis values from all sections
  for (const section of chartSections) {
    const { xAxisFieldName } = section;
    if (xAxisFieldName && data[xAxisFieldName]) {
      const sectionXAxisData = data[xAxisFieldName] as string[];
      sectionXAxisData.forEach((value) => xAxisValuesSet.add(value));
    } else if (data[section.valueFieldNames[0]]) {
      // Use indexes if no x-axis field is specified
      const sectionLength = data[section.valueFieldNames[0]].length;
      Array.from({ length: sectionLength }, (_, i) =>
        (i + 1).toString()
      ).forEach((value) => xAxisValuesSet.add(value));
    }
  }

  const xAxisData = sortNumericOrText(Array.from(xAxisValuesSet));

  // Build series data
  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;

    if (!valueFieldNames.length) continue;

    legendData.push(...valueFieldNames);

    // Get x-axis data for this section
    const sectionXAxisData: string[] =
      xAxisFieldName && data[xAxisFieldName]
        ? (data[xAxisFieldName] as string[])
        : Array.from({ length: data[valueFieldNames[0]].length }, (_, i) =>
            (i + 1).toString()
          );

    // Map x-axis values to y-axis data
    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      if (data[valueFieldName]) {
        const seriesYData: (string | null)[] = new Array(xAxisData.length).fill(
          null
        );
        const sectionYData = data[valueFieldName] as string[];

        sectionXAxisData.forEach((xValue, index) => {
          const globalIndex = xAxisData.indexOf(xValue);
          if (globalIndex !== -1) {
            seriesYData[globalIndex] = sectionYData[index];
          }
        });

        const customSeriesColor = customSeriesColors?.[valueFieldName];
        const legendIndex = legendData.indexOf(valueFieldName);

        series.push({
          name: valueFieldName,
          type: 'line',
          data: seriesYData,
          connectNulls: true,
          color: customSeriesColor
            ? customSeriesColor
            : getColor(legendIndex, valueFieldName),
        });
      }
    }
  }

  return {
    showLegend,
    legendData,
    series,
    xAxisData: addLineBreaks(xAxisData),
  };
}

export function getLineChartOption({
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
  const { textColor, borderColor, bgColor, hoverColor } = getThemeColors(theme);

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
      left: showLegend ? getValue(120) : getValue(10),
      top: getValue(30),
      right: getValue(20),
      bottom: getValue(40),
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        color: textColor,
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
      trigger: 'axis',
      textStyle: {
        fontSize: Math.max(12, fontSize),
        color: textColor,
      },
      backgroundColor: bgColor,
      borderColor: borderColor,
    },
    dataZoom: [
      {
        show: true,
        realtime: true,
        filterMode: 'empty',
        height: getValue(20),
        bottom: getValue(10),
        textStyle: {
          fontSize,
        },
        emphasis: {
          moveHandleStyle: {
            color: hoverColor,
          },
        },
      },
      {
        type: 'inside',
        realtime: true,
        filterMode: 'empty',
        height: getValue(20),
        bottom: getValue(10),
      },
    ],
  };
}
