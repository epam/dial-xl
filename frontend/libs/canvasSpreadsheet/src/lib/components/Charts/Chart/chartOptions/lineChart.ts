import { EChartsOption } from 'echarts';

import { ChartsData, GridChart } from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  sortNumericOrText,
} from '../common';

export function organizeLineChartData(
  chartData: ChartsData,
  gridChart: GridChart
): OrganizedData | undefined {
  const {
    chartSections,
    customSeriesColors,
    showLegend,
    showVisualMap,
    legendPosition,
    tableName,
  } = gridChart;
  const data = chartData[tableName];

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

  // Gather all unique x-axis values from all sections
  for (const section of chartSections) {
    const { xAxisFieldName } = section;
    if (xAxisFieldName && data[xAxisFieldName]) {
      const sectionXAxisRaw = data[xAxisFieldName].rawValues as string[];
      const sectionXAxisDisp = data[xAxisFieldName].displayValues as string[];
      sectionXAxisRaw.forEach((raw, i) => {
        xAxisValuesSet.add(raw);
        if (!xDisplayByRaw.has(raw))
          xDisplayByRaw.set(raw, sectionXAxisDisp?.[i] ?? raw);
      });
    } else if (data[section.valueFieldNames[0]]) {
      // Use indexes if no x-axis field is specified
      const sectionLength = data[section.valueFieldNames[0]].rawValues.length;
      Array.from({ length: sectionLength }, (_, i) =>
        (i + 1).toString()
      ).forEach((raw) => {
        xAxisValuesSet.add(raw);
        if (!xDisplayByRaw.has(raw)) xDisplayByRaw.set(raw, raw);
      });
    }
  }

  const xAxisData = sortNumericOrText(Array.from(xAxisValuesSet));
  const xAxisDisplayData = xAxisData.map(
    (raw) => xDisplayByRaw.get(raw) ?? raw
  );

  // Build series data
  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;

    if (!valueFieldNames.length) continue;

    legendData.push(...sortNumericOrText(valueFieldNames));

    // Get x-axis data for this section
    const sectionXAxisData: string[] =
      xAxisFieldName && data[xAxisFieldName]?.rawValues
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from(
            { length: data[valueFieldNames[0]]?.rawValues.length },
            (_, i) => (i + 1).toString()
          );

    // Map x-axis values to y-axis data
    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      if (data[valueFieldName]) {
        const seriesYData: (any | null)[] = new Array(xAxisData.length).fill(
          null
        );
        const sectionYDataRaw = data[valueFieldName].rawValues as string[];
        const sectionYDataDisplay = data[valueFieldName]
          .displayValues as string[];

        sectionXAxisData.forEach((xValue, index) => {
          const globalIndex = xAxisData.indexOf(xValue);
          if (globalIndex !== -1) {
            const raw = sectionYDataRaw[index];
            const disp = sectionYDataDisplay[index];
            const num = parseFloat(raw);
            seriesYData[globalIndex] = isNaN(num)
              ? null
              : { value: num, displayValue: disp };
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
    showVisualMap,
    legendData,
    legendPosition,
    series,
    xAxisData: addLineBreaks(xAxisDisplayData),
  };
}

export function getLineChartOption({
  series,
  xAxisData,
  legendData,
  zoom,
  theme,
  showLegend,
  showVisualMap,
  legendPosition,
}: GetOptionProps): EChartsOption {
  function z(value: number) {
    return value * zoom;
  }

  const fontSize = z(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);

  const layout = buildLayout({
    zoom,
    textColor,
    showLegend: !!showLegend,
    legendPosition,
    showDataZoom: !!showVisualMap,
  });

  return {
    textStyle: {
      ...layout.textStyle,
    },
    legend: {
      ...layout.legend,
      data: legendData,
    },
    grid: {
      ...layout.grid,
    },
    xAxis: {
      axisTick: {
        alignWithLabel: true,
      },
      type: 'category',
      boundaryGap: true,
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
                  data?.displayValue || data?.value || ''
                }</b></span>`
            )
            .join('<br/>')
        );
      },
    },
    dataZoom: [
      {
        show: !!showVisualMap,
        realtime: true,
        filterMode: 'empty',
        height: z(20),
        bottom: z(20),
        textStyle: {
          fontSize,
        },
      },
      {
        type: 'inside',
        realtime: true,
        filterMode: 'empty',
        height: z(20),
        bottom: z(20),
      },
    ],
  };
}
