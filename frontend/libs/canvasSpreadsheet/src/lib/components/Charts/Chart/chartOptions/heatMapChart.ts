import { EChartsOption } from 'echarts';

import { ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { addLineBreaks, getThemeColors, sortNumericOrText } from '../common';

export function organizeHeatMapChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const data = chartData[chartConfig.tableName];
  const { gridChart } = chartConfig;
  const { chartSections } = gridChart;

  if (
    !data ||
    !Object.keys(data).length ||
    !chartSections ||
    !chartSections.length
  )
    return;

  const { valueFieldNames, xAxisFieldName } = chartSections[0];

  if (!valueFieldNames.length) return;

  const firstField = valueFieldNames[0];
  const firstFieldData = data[firstField];
  if (!Array.isArray(firstFieldData)) {
    return;
  }

  const xAxisData: string[] =
    xAxisFieldName && Array.isArray(data[xAxisFieldName])
      ? (data[xAxisFieldName] as string[])
      : Array.from({ length: firstFieldData.length }, (_, i) =>
          (i + 1).toString()
        );

  const yAxisData = [...valueFieldNames];
  const seriesData: Array<[number, number, number | null]> = [];

  for (let i = 0; i < xAxisData.length; i++) {
    for (let j = 0; j < valueFieldNames.length; j++) {
      const valueFieldName = valueFieldNames[j];
      const value = data[valueFieldName]?.[i] ?? null;
      seriesData.push([i, j, Number(value)]);
    }
  }

  if (!seriesData.length || !yAxisData.length) return;

  const visualMapMax = Math.max(...seriesData.map(([, , value]) => value ?? 0));

  return {
    xAxisData: addLineBreaks(sortNumericOrText(xAxisData)),
    yAxisData,
    seriesData,
    visualMapMax,
  };
}

export function getHeatMapChartOption({
  seriesData,
  xAxisData,
  yAxisData,
  visualMapMax,
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
      top: getValue(30),
      right: getValue(20),
      bottom: getValue(50),
      containLabel: true,
    },
    xAxis: {
      type: 'category',
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
      type: 'category',
      data: yAxisData,
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
    visualMap: {
      min: 0,
      max: visualMapMax || 0,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      height: getValue(20),
      bottom: getValue(2),
    },
    series: [
      {
        name: '',
        type: 'heatmap',
        data: seriesData,
        label: {
          show: true,
          fontSize,
          width: getValue(50),
          overflow: 'truncate',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    tooltip: {
      textStyle: {
        fontSize: Math.max(12, fontSize),
        color: textColor,
      },
      backgroundColor: bgColor,
      borderColor: borderColor,
    },
  };
}
