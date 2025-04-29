import { EChartsOption, PieSeriesOption } from 'echarts';
import {
  OptionDataItemObject,
  OptionDataValue,
} from 'echarts/types/src/util/types';

import { chartRowNumberSelector, ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { getColor, getThemeColors, sortNumericOrText } from '../common';

export function organizePieChartData(
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

  const legendData: string[] = [];
  const seriesData = [];
  const valueFieldNames = chartSections[0].valueFieldNames;
  const sortedDataKeys = sortNumericOrText(valueFieldNames);

  for (const key of sortedDataKeys) {
    const value = data[key];
    legendData.push(key);
    const rowIndex = parseInt(rowNumber) - 1;

    if (value.length < rowIndex) return;

    seriesData.push({
      name: key,
      value: parseFloat(value[rowIndex] as string),
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
          const { name } = params.data as OptionDataItemObject<OptionDataValue>;
          const legendIndex = legendData.indexOf(params.name);

          return (
            customSeriesColors?.[params.name] ||
            getColor(legendIndex, name?.toString())
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
    },
  };
}
