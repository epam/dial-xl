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
  const { chartSections, chartOrientation } = gridChart;

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
  const firstFieldData = data[firstField]?.rawValues;

  if (!Array.isArray(firstFieldData)) return;

  const rowLabels: string[] =
    xAxisFieldName && Array.isArray(data[xAxisFieldName]?.rawValues)
      ? (data[xAxisFieldName].rawValues as string[])
      : Array.from({ length: firstFieldData.length }, (_, i) =>
          (i + 1).toString()
        );

  const rowLabelsDisplay: string[] | undefined =
    xAxisFieldName && Array.isArray(data[xAxisFieldName]?.displayValues)
      ? (data[xAxisFieldName].displayValues as string[])
      : undefined;

  const xDisplayByRaw = new Map<string, string>();
  rowLabels.forEach((raw, i) => {
    if (!xDisplayByRaw.has(raw)) {
      xDisplayByRaw.set(raw, rowLabelsDisplay?.[i] ?? raw);
    }
  });

  let xAxisData: string[];
  let yAxisData: string[];
  const seriesData: Array<[number, number, number | null, string]> = [];

  if (chartOrientation === 'vertical') {
    xAxisData = addLineBreaks([...valueFieldNames]);
    yAxisData = addLineBreaks(
      rowLabels.map((raw) => xDisplayByRaw.get(raw) ?? raw)
    );

    for (let rowIdx = 0; rowIdx < rowLabels.length; rowIdx++) {
      for (let colIdx = 0; colIdx < valueFieldNames.length; colIdx++) {
        const fieldName = valueFieldNames[colIdx];
        const value = data[fieldName]?.rawValues[rowIdx] ?? null;
        const displayValue = data[fieldName]?.displayValues?.[rowIdx] as string;
        seriesData.push([colIdx, rowIdx, Number(value), displayValue]);
      }
    }
  } else {
    const sortedRowLabels = sortNumericOrText(rowLabels);
    xAxisData = addLineBreaks(
      sortedRowLabels.map((raw) => xDisplayByRaw.get(raw) ?? raw)
    );
    yAxisData = [...valueFieldNames];

    for (let colIdx = 0; colIdx < rowLabels.length; colIdx++) {
      for (let rowIdx = 0; rowIdx < valueFieldNames.length; rowIdx++) {
        const fieldName = valueFieldNames[rowIdx];
        const value = data[fieldName]?.rawValues[colIdx] ?? null;
        const displayValue = data[fieldName]?.displayValues?.[colIdx] as string;
        seriesData.push([colIdx, rowIdx, Number(value), displayValue]);
      }
    }
  }

  if (!seriesData.length || !yAxisData.length) return;

  const visualMapMax = Math.max(...seriesData.map(([, , value]) => value ?? 0));

  return { xAxisData, yAxisData, seriesData, visualMapMax };
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
      dimension: 2,
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
          formatter: (p: any) => p.data?.[3] ?? p.data?.[2],
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        encode: {
          x: 0,
          y: 1,
          value: 2,
          tooltip: 3,
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
      formatter: (params: any) => {
        const { marker, data, name } = params;

        return `${marker}${name}<span style="float: right; margin-left: 20px"><b>${
          data?.[3] || data?.[2] || ''
        }</b></span>`;
      },
    },
  };
}
