import {
  EChartsOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';

import { ChartsData, ChartType, GridChart } from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  isHtmlColor,
  makeUniqueLabel,
  sortNumericOrText,
} from '../common';

const stackedCharts = [ChartType.STACKED_BAR, ChartType.STACKED_COLUMN];
const horizontalCharts = [ChartType.CLUSTERED_BAR, ChartType.STACKED_BAR];

export function organizeBarChartData(
  chartData: ChartsData,
  gridChart: GridChart,
): OrganizedData | undefined {
  const {
    chartSections,
    customSeriesColors,
    showLegend,
    chartOrientation,
    legendPosition,
    tableName,
    chartType,
  } = gridChart;
  const data = chartData[tableName];

  if (!data || !Object.keys(data).length || !chartSections?.length) return;

  const legendData: string[] = [];
  const xAxisData: string[] = [];
  const xDisplayByRaw = new Map<string, string>();
  const series: EChartsOption['series'] = [];
  const isStacked = stackedCharts.includes(chartType);
  const stackKey = isStacked ? 'stack' : undefined;
  const orientation = horizontalCharts.includes(chartType)
    ? 'horizontal'
    : 'vertical';
  // for the horizontal axis we need per-row labels in table order with duplicates preserved
  let horizontalXAxisDisplayUnique: string[] | undefined;

  for (const section of chartSections) {
    const { xAxisFieldName, valueFieldNames } = section;

    if (!Array.isArray(valueFieldNames) || !valueFieldNames.length) continue;

    const rowCount = Array.isArray(data[valueFieldNames[0]]?.rawValues)
      ? data[valueFieldNames[0]].rawValues.length
      : 0;

    const rowNumbers = Array.from({ length: rowCount }, (_, i) =>
      (i + 1).toString(),
    );

    const rowLabels: string[] =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.rawValues)
        ? (data[xAxisFieldName].rawValues as string[])
        : rowNumbers;

    const rowLabelsDisplay: string[] | undefined =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.displayValues)
        ? (data[xAxisFieldName].displayValues as string[])
        : undefined;

    rowLabels.forEach((raw, i) => {
      if (!xDisplayByRaw.has(raw)) {
        xDisplayByRaw.set(raw, rowLabelsDisplay?.[i] ?? raw);
      }
    });

    if (chartOrientation === 'horizontal') {
      if (!xAxisData.length) {
        xAxisData.push(...rowLabels);

        // build display labels per row, keep duplicates
        const occByDisplay = new Map<string, number>();
        horizontalXAxisDisplayUnique = rowLabels.map((raw, i) => {
          const baseLabel = (rowLabelsDisplay?.[i] ?? raw) || raw || `${i + 1}`;
          const occ = (occByDisplay.get(baseLabel) ?? 0) + 1;
          occByDisplay.set(baseLabel, occ);

          return makeUniqueLabel(baseLabel, occ);
        });
      }

      for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
        legendData.push(valueFieldName);

        const fieldValues = data[valueFieldName]?.rawValues;
        const fieldValuesDisplay = data[valueFieldName]?.displayValues;
        if (!Array.isArray(fieldValues)) return;

        const seriesData = rowNumbers.map((row) => {
          const idx = Number(row) - 1;
          const v = fieldValues[idx];
          const n = parseFloat(v as string);
          const disp = fieldValuesDisplay?.[idx];

          return isNaN(n) ? null : { value: n, displayValue: disp };
        });

        const colorIndex = legendData.indexOf(valueFieldName);

        series.push({
          name: valueFieldName,
          type: 'bar',
          stack: stackKey,
          data: seriesData,
          itemStyle: {
            color:
              customSeriesColors?.[valueFieldName] ||
              getColor(colorIndex === -1 ? 0 : colorIndex, valueFieldName),
          },
        });
      }
    } else {
      const dotColorFieldName = section.dotColorFieldName;
      const dotColors: string[] | undefined =
        dotColorFieldName && Array.isArray(data[dotColorFieldName]?.rawValues)
          ? (data[dotColorFieldName].rawValues as string[])
          : undefined;

      xAxisData.push(...valueFieldNames);

      for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        const rowName = rowLabels[rowIdx] ?? `Row ${rowIdx + 1}`;
        legendData.push(rowName);

        const barValues = valueFieldNames.map((field) => {
          const v = data[field]?.rawValues?.[rowIdx];
          const n = parseFloat(v as string);
          const disp = data[field]?.displayValues?.[rowIdx];

          return isNaN(n) ? null : { value: n, displayValue: disp };
        });

        const colorIndex = legendData.indexOf(rowName);
        const colorCandidate = dotColors?.[rowIdx];
        const barColor =
          colorCandidate && isHtmlColor(colorCandidate)
            ? colorCandidate
            : customSeriesColors?.[rowName] ||
              getColor(colorIndex === -1 ? 0 : colorIndex, rowName);

        series.push({
          name: rowName,
          type: 'bar',
          stack: stackKey,
          data: barValues,
          itemStyle: {
            color: barColor,
          },
        });
      }
    }
  }

  const uniqueLegendData = [...new Set(legendData)];

  // do not dedupe x-axis in horizontal mode; preserve order + duplicates
  const finalXAxisData =
    chartOrientation === 'horizontal' && horizontalXAxisDisplayUnique
      ? addLineBreaks(horizontalXAxisDisplayUnique)
      : addLineBreaks(
          [...new Set(xAxisData)]
            .filter(Boolean)
            .map((raw) => xDisplayByRaw.get(raw) ?? raw),
        );

  return {
    legendPosition,
    showLegend,
    series,
    legendData: uniqueLegendData,
    xAxisData: finalXAxisData,
    orientation,
  };
}

export function getBarChartOption({
  series,
  xAxisData,
  legendData,
  zoom,
  theme,
  showLegend,
  legendPosition,
  orientation = 'vertical',
}: GetOptionProps): EChartsOption {
  function z(value: number) {
    return value * zoom;
  }

  const fontSize = z(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);
  const isHorizontal = orientation === 'horizontal';

  const xAxis: XAXisComponentOption = isHorizontal
    ? {
        type: 'value',
        nameTextStyle: { fontSize },
        axisLabel: { color: textColor, fontSize },
      }
    : {
        type: 'category',
        data: xAxisData,
        nameTextStyle: { fontSize },
        axisLabel: { color: textColor, fontSize },
        axisTick: {
          alignWithLabel: true,
        },
      };

  const yAxis: YAXisComponentOption = isHorizontal
    ? {
        type: 'category',
        data: xAxisData,
        nameTextStyle: { fontSize },
        axisLabel: { color: textColor, fontSize },
        splitLine: { lineStyle: { color: borderColor } },
        axisTick: {
          alignWithLabel: true,
        },
      }
    : {
        type: 'value',
        nameTextStyle: { fontSize },
        axisLabel: { color: textColor, fontSize },
        splitLine: { lineStyle: { color: borderColor } },
      };

  const layout = buildLayout({
    zoom,
    textColor,
    showLegend: !!showLegend,
    legendPosition,
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
    xAxis,
    yAxis,
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
                }</b></span>`,
            )
            .join('<br/>')
        );
      },
    },
  };
}
