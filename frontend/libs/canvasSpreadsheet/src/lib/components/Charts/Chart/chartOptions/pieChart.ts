import { EChartsOption, PieSeriesOption } from 'echarts';
import {
  OptionDataItemObject,
  OptionDataValue,
} from 'echarts/types/src/util/types.js';

import { chartRowNumberSelector, ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  getColor,
  getThemeColors,
  isHtmlColor,
  sortNumericOrText,
} from '../common';

export function organizePieChartData(
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

  const rowOrCol = selectedKeys[chartRowNumberSelector];
  if (typeof rowOrCol !== 'string') return;

  const legendData: string[] = [];
  const seriesData = [];
  const valueFieldNames = chartSections[0].valueFieldNames;
  const sortedDataKeys = sortNumericOrText(valueFieldNames);
  const dotColorFieldName = chartSections[0].dotColorFieldName;
  const dotColors: string[] | undefined =
    dotColorFieldName && Array.isArray(data[dotColorFieldName]?.rawValues)
      ? (data[dotColorFieldName].rawValues as string[])
      : undefined;

  if (chartOrientation === 'vertical') {
    const rowIndex = parseInt(rowOrCol, 10) - 1;
    if (isNaN(rowIndex)) return;

    for (const key of sortedDataKeys) {
      const columnValues = data[key]?.rawValues;
      const displayValues = data[key]?.displayValues;
      if (!Array.isArray(columnValues) || rowIndex >= columnValues.length)
        return;

      legendData.push(key);
      seriesData.push({
        name: key,
        value: parseFloat(columnValues[rowIndex] as string),
        displayValue: displayValues[rowIndex],
      });
    }
  } else if (chartOrientation === 'horizontal') {
    const numericField = valueFieldNames.includes(rowOrCol)
      ? rowOrCol
      : valueFieldNames[0];

    if (!numericField) return;

    const { xAxisFieldName } = chartSections[0];
    const rowLabels: string[] =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.rawValues)
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from(
            { length: (data[numericField]?.rawValues || []).length },
            (_, i) => `${i + 1}`
          );

    const rowLabelsDisplay: string[] | undefined =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.displayValues)
        ? (data[xAxisFieldName].displayValues as string[])
        : undefined;

    const columnValues = data[numericField]?.rawValues || [];
    const displayValues = data[numericField]?.displayValues || [];

    columnValues.forEach((raw: any, i: number) => {
      const num = parseFloat(raw as string);
      if (isNaN(num)) return;

      const rawLabel = rowLabels[i] ?? `${i + 1}`;
      const displayLabel = rowLabelsDisplay?.[i] ?? rawLabel;

      legendData.push(displayLabel);
      let sliceColor: string | undefined;
      const colorCandidate = dotColors?.[i];

      if (colorCandidate && isHtmlColor(colorCandidate)) {
        sliceColor = colorCandidate;
      } else {
        const legendIdx = legendData.indexOf(displayLabel);
        sliceColor =
          customSeriesColors?.[rawLabel] || getColor(legendIdx, rawLabel);
      }

      seriesData.push({
        name: displayLabel,
        rawName: rawLabel,
        value: num,
        itemStyle: { color: sliceColor },
        displayValue: displayValues[i],
      });
    });
  }

  const series: EChartsOption['series'] = [
    {
      name: '',
      type: 'pie',
      radius: '70%',
      data: seriesData,
      stillShowZeroSum: false,
      itemStyle: {
        color: (params) => {
          const { name, rawName } =
            params.data as OptionDataItemObject<OptionDataValue> & {
              rawName: string;
            };
          const lookupName = name?.toString() || params.name;
          const legendIndex = legendData.indexOf(lookupName);

          return (
            customSeriesColors?.[lookupName] ||
            getColor(legendIndex, rawName?.toString() || name?.toString())
          );
        },
      },
    },
  ];

  return {
    showLegend,
    legendData,
    series,
  };
}

export function getPieChartOption({
  series,
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

  const seriesWithStyles = series
    ? (series as PieSeriesOption[]).map(
        (s): PieSeriesOption => ({
          ...s,
          label: {
            color: textColor,
            fontSize,
            show: !(
              s?.data &&
              s.data.every(
                (item) =>
                  (item as OptionDataItemObject<OptionDataValue>).value === 0
              )
            ),
            formatter: (p: any) => {
              return p.data?.displayValue ?? p.value;
            },
          },
          labelLine: {
            length: getValue(15),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        })
      )
    : [];

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
      left: showLegend ? getValue(140) : getValue(10),
      top: getValue(10),
      right: getValue(10),
      bottom: getValue(10),
      containLabel: true,
    },
    series: seriesWithStyles,
    tooltip: {
      trigger: 'item',
      textStyle: {
        fontSize: Math.max(12, fontSize),
        color: textColor,
      },
      backgroundColor: bgColor,
      borderColor: borderColor,
      formatter: (params: any) => {
        const { marker, data, name } = params;

        return `${marker}${name}<span style="float: right; margin-left: 20px"><b>${
          data?.displayValue || data.value
        }</b></span>`;
      },
    },
  };
}
