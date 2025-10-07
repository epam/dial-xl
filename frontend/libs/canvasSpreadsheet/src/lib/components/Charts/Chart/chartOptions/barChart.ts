import { EChartsOption } from 'echarts';
import {
  OptionDataItemObject,
  OptionDataValue,
} from 'echarts/types/src/util/types.js';

import { chartRowNumberSelector, ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  isHtmlColor,
  sortNumericOrText,
} from '../common';

export function organizeBarChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const data = chartData[chartConfig.tableName];
  const { gridChart } = chartConfig;
  const {
    chartSections,
    customSeriesColors,
    selectedKeys,
    showLegend,
    chartOrientation,
  } = gridChart;

  if (
    !data ||
    !Object.keys(data).length ||
    !chartSections ||
    !chartSections.length
  )
    return;

  const section = chartSections[0];
  const { xAxisFieldName, valueFieldNames } = section;
  const allNumericFields = sortNumericOrText(valueFieldNames);
  if (!allNumericFields.length) return;

  const selectorKey = selectedKeys[chartRowNumberSelector];
  if (typeof selectorKey !== 'string') return;

  const legendData: string[] = [];
  const xAxisData: string[] = [];
  const series: EChartsOption['series'] = [];
  const dotColorFieldName = chartSections[0].dotColorFieldName;
  const dotColors: string[] | undefined =
    dotColorFieldName && Array.isArray(data[dotColorFieldName]?.rawValues)
      ? (data[dotColorFieldName].rawValues as string[])
      : undefined;

  if (chartOrientation === 'vertical') {
    const rowIndex = Number(selectorKey) - 1;
    if (isNaN(rowIndex) || rowIndex < 0) return;

    const totalKeys = allNumericFields.length;

    for (let i = 0; i < totalKeys; i++) {
      const field = allNumericFields[i];
      const columnValues = data[field]?.rawValues;
      const displayValues = data[field]?.displayValues;
      if (!Array.isArray(columnValues) || rowIndex >= columnValues.length)
        return;

      const num = parseFloat(columnValues[rowIndex] as string);
      const value = isNaN(num) ? null : num;

      legendData.push(field);
      xAxisData.push(field);

      const seriesData = Array(totalKeys).fill(null);
      seriesData[i] =
        value === null
          ? null
          : ({
              value,
              displayValue: displayValues[rowIndex],
              rawName: field,
            } as OptionDataItemObject<OptionDataValue> & {
              displayValue?: string;
              rawName: string;
            });

      series.push({
        name: field,
        rawName: field,
        type: 'bar',
        stack: 'stack',
        data: seriesData as (
          | null
          | (OptionDataItemObject<OptionDataValue> & {
              displayValue?: string;
              rawName: string;
            })
        )[],
        itemStyle: {
          color: customSeriesColors?.[field] || getColor(i, field),
        },
      } as any);
    }
  } else {
    const numericField = allNumericFields.includes(selectorKey)
      ? selectorKey
      : allNumericFields[0];

    if (!numericField) return;

    const valueCol = data[numericField]?.rawValues;
    const displayValues = data[numericField]?.displayValues;
    if (!Array.isArray(valueCol)) return;

    const rowCount = valueCol.length;
    const rowLabels: string[] =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.rawValues)
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from({ length: rowCount }, (_, i) => (i + 1).toString());

    const rowLabelsDisplay: string[] | undefined =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.displayValues)
        ? (data[xAxisFieldName].displayValues as string[])
        : undefined;

    rowLabels.forEach((label, i) => {
      const num = parseFloat(valueCol[i] as string);
      if (isNaN(num)) return;

      const displayLabel = rowLabelsDisplay?.[i] ?? label;

      // Store display labels in legendData for the legend
      legendData.push(displayLabel);

      const seriesData = Array(rowLabels.length).fill(null);
      seriesData[i] = {
        value: num,
        displayValue: displayValues[i],
        rawName: label,
      } as OptionDataItemObject<OptionDataValue> & {
        displayValue?: string;
        rawName: string;
      };

      const colorCandidate = dotColors?.[i];
      const barColor =
        colorCandidate && isHtmlColor(colorCandidate)
          ? colorCandidate
          : customSeriesColors?.[label] || getColor(i, label);

      series.push({
        name: displayLabel,
        rawName: label,
        type: 'bar',
        data: seriesData,
        stack: 'rows',
        itemStyle: { color: barColor },
      } as any);
    });

    xAxisData.push(...rowLabels);
  }

  return {
    showLegend,
    legendData,
    series,
    xAxisData:
      chartOrientation === 'vertical'
        ? addLineBreaks(sortNumericOrText(xAxisData))
        : addLineBreaks(xAxisData),
    isHorizontal: chartOrientation === 'horizontal',
  };
}

export function getBarChartOption({
  series,
  xAxisData,
  legendData,
  zoom,
  theme,
  showLegend,
  isHorizontal,
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
        show: isHorizontal,
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
      formatter: (params: any) => {
        const { marker, data, name, seriesName } = params;
        const displayName = data?.rawName ? seriesName : name;

        return `${marker}${displayName}<span style="float: right; margin-left: 20px"><b>${
          data?.displayValue || data?.value || ''
        }</b></span>`;
      },
    },
  };
}
