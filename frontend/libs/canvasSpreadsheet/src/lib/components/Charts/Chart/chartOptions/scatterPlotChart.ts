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
  const xDisplayByRaw = new Map<string, string>();
  const series: EChartsOption['series'] = [];

  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;

    if (!valueFieldNames.length) continue;

    legendData.push(...valueFieldNames);

    if (!data[valueFieldNames[0]]) return;

    const sectionXAxisData =
      xAxisFieldName && data[xAxisFieldName]
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from(
            { length: data[valueFieldNames[0]]?.rawValues.length },
            (_, i) => (i + 1).toString()
          );

    const sectionXAxisDisp: string[] | undefined =
      xAxisFieldName && data[xAxisFieldName]
        ? (data[xAxisFieldName].displayValues as string[])
        : undefined;

    sectionXAxisData.forEach((raw, i) => {
      xAxisValuesSet.add(raw);

      if (!xDisplayByRaw.has(raw)) {
        xDisplayByRaw.set(raw, sectionXAxisDisp?.[i] ?? raw);
      }
    });

    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      if (!data[valueFieldName] || !data[valueFieldName].rawValues) continue;

      const seriesYData = data[valueFieldName].rawValues as string[];
      const displaySeriesYData = data[valueFieldName].displayValues as string[];
      const dotSizeField = section.dotSizeFieldName
        ? (data[section.dotSizeFieldName].rawValues as string[])
        : undefined;
      const dotColorField = section.dotColorFieldName
        ? (data[section.dotColorFieldName].rawValues as string[])
        : undefined;

      const legendIndex = legendData.indexOf(valueFieldName);

      if (!seriesYData || seriesYData.length < sectionXAxisData.length) return;

      const xAxisRawSorted = sortNumericOrText(Array.from(xAxisValuesSet));

      const xIndexByRaw = new Map<string, number>(
        xAxisRawSorted.map((r, idx) => [r, idx])
      );

      const scatterData = sectionXAxisData.map((xRaw, index) => {
        const xIndex = xIndexByRaw.get(xRaw) ?? null;

        return {
          value: [xIndex, seriesYData[index]],
          displayValue: [xIndex, displaySeriesYData[index]],
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

  const xAxisRawSorted = sortNumericOrText(Array.from(xAxisValuesSet));
  const xAxisDisplayData = xAxisRawSorted.map(
    (raw) => xDisplayByRaw.get(raw) ?? raw
  );
  const xAxisData = addLineBreaks(xAxisDisplayData);

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
      formatter: (params: any) => {
        const axisLabel =
          params.length > 0 ? params[0].axisValue + '</br>' : '';

        return (
          axisLabel +
          params
            .map(
              ({ marker, data, seriesName }: any) =>
                `${marker}${seriesName}<span style="float: right; margin-left: 20px"><b>${
                  data?.displayValue?.[1] || data?.value?.[1] || ''
                }</b></span>`
            )
            .join('<br/>')
        );
      },
    },
  };
}
