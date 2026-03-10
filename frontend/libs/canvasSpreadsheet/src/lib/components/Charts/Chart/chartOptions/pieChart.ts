import { EChartsOption, PieSeriesOption } from 'echarts';
import { GridOption } from 'echarts/types/dist/shared';
import {
  OptionDataItemObject,
  OptionDataValue,
} from 'echarts/types/src/util/types.js';

import {
  chartRowNumberSelector,
  ChartsData,
  GridChart,
} from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  getColor,
  getThemeColors,
  isHtmlColor,
  makeUniqueLabel,
  sortNumericOrText,
} from '../common';

export function organizePieChartData(
  chartData: ChartsData,
  gridChart: GridChart,
): OrganizedData | undefined {
  const {
    chartSections,
    customSeriesColors,
    selectedKeys,
    showLegend,
    chartOrientation,
    legendPosition,
    tableName,
  } = gridChart;
  const data = chartData[tableName];

  if (!data || !Object.keys(data).length || !chartSections?.length) return;

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
            (_, i) => `${i + 1}`,
          );

    const rowLabelsDisplay: string[] | undefined =
      xAxisFieldName && Array.isArray(data[xAxisFieldName]?.displayValues)
        ? (data[xAxisFieldName].displayValues as string[])
        : undefined;

    const columnValues = data[numericField]?.rawValues || [];
    const displayValues = data[numericField]?.displayValues || [];

    // track occurrences to keep duplicates as separate slices (in table order)
    const occByDisplayLabel = new Map<string, number>();

    columnValues.forEach((raw: any, i: number) => {
      const num = parseFloat(raw as string);
      if (isNaN(num)) return;

      const rawLabel = rowLabels[i] ?? `${i + 1}`;
      const displayLabel = rowLabelsDisplay?.[i] ?? rawLabel;

      const occ = (occByDisplayLabel.get(displayLabel) ?? 0) + 1;
      occByDisplayLabel.set(displayLabel, occ);
      const uniqueDisplayLabel = makeUniqueLabel(displayLabel, occ);

      // legendData must use the SAME unique name
      legendData.push(uniqueDisplayLabel);

      let sliceColor: string | undefined;
      const colorCandidate = dotColors?.[i];

      if (colorCandidate && isHtmlColor(colorCandidate)) {
        sliceColor = colorCandidate;
      } else {
        const legendIdx = legendData.indexOf(uniqueDisplayLabel);
        sliceColor =
          customSeriesColors?.[rawLabel] || getColor(legendIdx, rawLabel);
      }

      seriesData.push({
        name: uniqueDisplayLabel,
        displayName: displayLabel,
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
      radius: '80%',
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
    legendPosition,
    legendData,
    series,
  };
}

export function getPieChartOption({
  series,
  legendData,
  legendPosition,
  zoom,
  theme,
  showLegend,
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
  });

  let topOffset = z(20);
  const grid = layout.grid as GridOption;

  if (typeof grid?.top === 'number') {
    topOffset = grid.top - 10;
  }

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
                  (item as OptionDataItemObject<OptionDataValue>).value === 0,
              )
            ),
            formatter: (p: any) => {
              return p.data?.displayValue ?? p.value;
            },
          },
          bottom: grid.bottom,
          top: topOffset,
          labelLine: {
            length: z(15),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        }),
      )
    : [];

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
