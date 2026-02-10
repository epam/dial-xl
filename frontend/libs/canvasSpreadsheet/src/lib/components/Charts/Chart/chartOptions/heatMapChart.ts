import { EChartsOption } from 'echarts';

import { ChartsData, GridChart } from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { addLineBreaks, getThemeColors, sortNumericOrText } from '../common';

export function organizeHeatMapChartData(
  chartData: ChartsData,
  gridChart: GridChart
): OrganizedData | undefined {
  const { chartSections, chartOrientation, showVisualMap, tableName } =
    gridChart;
  const data = chartData[tableName];

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

  return {
    xAxisData,
    yAxisData,
    seriesData,
    showVisualMap,
    visualMapMax,
  };
}

export function getHeatMapChartOption({
  seriesData,
  xAxisData,
  yAxisData,
  visualMapMax,
  showVisualMap,
  zoom,
  theme,
}: GetOptionProps): EChartsOption {
  function z(value: number) {
    return value * zoom;
  }

  const fontSize = z(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);

  const layout = buildLayout({
    zoom,
    textColor,
    legendPosition: 'bottom',
    showVisualMap: !!showVisualMap,
  });

  return {
    textStyle: {
      ...layout.textStyle,
    },
    grid: {
      ...layout.grid,
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
      axisTick: {
        alignWithLabel: true,
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
      show: !!showVisualMap,
      min: 0,
      max: visualMapMax || 0,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      height: z(20),
      bottom: z(10),
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
          width: z(50),
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
