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

const defaultDotSize = 10;

export function organizeScatterPlotChartData(
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

  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;

    if (!valueFieldNames.length) continue;

    legendData.push(...valueFieldNames);

    if (!data[valueFieldNames[0]]) return;

    const sectionXAxisData =
      xAxisFieldName && data[xAxisFieldName]
        ? (data[xAxisFieldName] as string[])
        : Array.from({ length: data[valueFieldNames[0]].length }, (_, i) =>
            (i + 1).toString()
          );

    sectionXAxisData.forEach((value) => xAxisValuesSet.add(value));

    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      const seriesYData = data[valueFieldName] as string[];
      const dotSizeField = section.dotSizeFieldName
        ? (data[section.dotSizeFieldName] as string[])
        : undefined;
      const dotColorField = section.dotColorFieldName
        ? (data[section.dotColorFieldName] as string[])
        : undefined;

      const legendIndex = legendData.indexOf(valueFieldName);

      if (!seriesYData || seriesYData.length < sectionXAxisData.length) return;

      const scatterData = sectionXAxisData.map((xValue, index) => {
        const xIndex = Array.from(xAxisValuesSet).indexOf(xValue);

        return {
          value: [xIndex, seriesYData[index]],
          symbolSize: dotSizeField
            ? parseFloat(dotSizeField[index]) || defaultDotSize
            : defaultDotSize,
          itemStyle: {
            color:
              dotColorField?.[index] ||
              customSeriesColors?.[valueFieldName] ||
              getColor(legendIndex),
          },
        };
      });

      series.push({
        name: valueFieldName,
        type: 'scatter',
        data: scatterData,
        itemStyle: {
          color:
            customSeriesColors?.[valueFieldName] ||
            getColor(legendIndex, valueFieldName),
        },
      });
    }
  }

  const xAxisData = addLineBreaks(
    sortNumericOrText(Array.from(xAxisValuesSet))
  );

  return {
    showLegend,
    legendData,
    series,
    xAxisData,
  };
}

export function getScatterPlotChartOption({
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
  };
}
