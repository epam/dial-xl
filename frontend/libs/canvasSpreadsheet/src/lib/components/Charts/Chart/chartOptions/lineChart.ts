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
  gridChart: GridChart,
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

  if (!data || !Object.keys(data).length || !chartSections?.length) return;

  const legendData: string[] = [];
  const xDisplayByRaw = new Map<string, string>();
  const series: EChartsOption['series'] = [];

  /**
   * 1) Build base X axis in table order:
   *    - prefer the first section with custom xAxisFieldName
   *    - fallback to indexes if no custom x-axis exists
   * 2) Expand axis if other sections require extra occurrences / new values
   */

  // Base axis in table order
  let xAxisDataRaw: string[] | undefined;
  let xAxisDisplayBase: string[] | undefined;

  // First pass: pick the base axis and collect display labels
  for (const section of chartSections) {
    const { xAxisFieldName } = section;
    if (xAxisFieldName && data[xAxisFieldName]) {
      const sectionXAxisRaw = data[xAxisFieldName].rawValues as string[];
      const sectionXAxisDisp = data[xAxisFieldName].displayValues as string[];
      sectionXAxisRaw.forEach((raw, i) => {
        if (!xDisplayByRaw.has(raw))
          xDisplayByRaw.set(raw, sectionXAxisDisp?.[i] ?? raw);
      });

      if (!xAxisDataRaw) {
        xAxisDataRaw = sectionXAxisRaw;
        xAxisDisplayBase = sectionXAxisDisp;
      }
    } else if (data[section.valueFieldNames[0]]) {
      // Use indexes if no x-axis field is specified
      const sectionLength = data[section.valueFieldNames[0]].rawValues.length;
      const idxAxis = Array.from({ length: sectionLength }, (_, i) =>
        (i + 1).toString(),
      );

      idxAxis.forEach((raw) => {
        if (!xDisplayByRaw.has(raw)) xDisplayByRaw.set(raw, raw);
      });

      if (!xAxisDataRaw) {
        xAxisDataRaw = idxAxis;
        xAxisDisplayBase = idxAxis;
      }
    }
  }

  if (!xAxisDataRaw) return;

  // Start display axis from the base
  const xAxisDisplay: string[] =
    xAxisDisplayBase?.length === xAxisDataRaw.length
      ? [...xAxisDisplayBase]
      : xAxisDataRaw.map((raw) => xDisplayByRaw.get(raw) ?? raw);

  // Slots for duplicates on the current axis: raw -> indices where it appears
  const slotsByRaw = new Map<string, number[]>();
  xAxisDataRaw.forEach((raw, idx) => {
    const arr = slotsByRaw.get(raw);
    if (arr) {
      arr.push(idx);
    } else {
      slotsByRaw.set(raw, [idx]);
    }
  });

  // Second pass: expand the base axis if other sections need extra slots
  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;
    if (!valueFieldNames.length) continue;

    const sectionXAxisData: string[] =
      xAxisFieldName && data[xAxisFieldName]?.rawValues
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from(
            { length: data[valueFieldNames[0]]?.rawValues.length },
            (_, i) => (i + 1).toString(),
          );

    // occurrence counter within this section
    const occByRaw = new Map<string, number>();

    sectionXAxisData.forEach((xValue, i) => {
      const occ = occByRaw.get(xValue) ?? 0;
      occByRaw.set(xValue, occ + 1);

      const slots = slotsByRaw.get(xValue);

      // If there is no slot for this occurrence -> append to axis
      if (!slots || slots[occ] === undefined) {
        const newIndex = xAxisDataRaw!.length;
        xAxisDataRaw!.push(xValue);

        // learn to display label for this raw if not known yet
        if (!xDisplayByRaw.has(xValue)) {
          if (xAxisFieldName && data[xAxisFieldName]?.displayValues) {
            const dispArr = data[xAxisFieldName].displayValues as string[];
            xDisplayByRaw.set(xValue, dispArr?.[i] ?? xValue);
          } else {
            xDisplayByRaw.set(xValue, xValue);
          }
        }

        xAxisDisplay.push(xDisplayByRaw.get(xValue) ?? xValue);

        if (slots) slots.push(newIndex);
        else slotsByRaw.set(xValue, [newIndex]);
      }
    });
  }

  /**
   * Build series data using slotsByRaw + per-section occurrence counters
   */
  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;
    if (!valueFieldNames.length) continue;

    legendData.push(...sortNumericOrText(valueFieldNames));

    const sectionXAxisData: string[] =
      xAxisFieldName && data[xAxisFieldName]?.rawValues
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from(
            { length: data[valueFieldNames[0]]?.rawValues.length },
            (_, i) => (i + 1).toString(),
          );

    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      if (!data[valueFieldName]) continue;

      const seriesYData: (any | null)[] = new Array(xAxisDataRaw.length).fill(
        null,
      );

      const sectionYDataRaw = data[valueFieldName].rawValues as string[];
      const sectionYDataDisplay = data[valueFieldName]
        .displayValues as string[];

      const occByRaw = new Map<string, number>();

      sectionXAxisData.forEach((xValue, index) => {
        const occ = occByRaw.get(xValue) ?? 0;
        occByRaw.set(xValue, occ + 1);

        const slotIndex = slotsByRaw.get(xValue)?.[occ];
        if (slotIndex === undefined) return;

        const raw = sectionYDataRaw[index];
        const disp = sectionYDataDisplay[index];
        const num = parseFloat(raw);

        seriesYData[slotIndex] = isNaN(num)
          ? null
          : { value: num, displayValue: disp };
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

  return {
    showLegend,
    showVisualMap,
    legendData,
    legendPosition,
    series,
    xAxisData: addLineBreaks(xAxisDisplay),
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

  const dataZoom: EChartsOption['dataZoom'] = showVisualMap
    ? [
        {
          show: true,
          realtime: true,
          filterMode: 'empty',
          height: z(20),
          bottom: z(20),
          textStyle: { fontSize },
        },
        {
          type: 'inside',
          realtime: true,
          filterMode: 'empty',
          height: z(20),
          bottom: z(20),

          zoomOnMouseWheel: 'ctrl',
          moveOnMouseWheel: false,
        },
      ]
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
                }</b></span>`,
            )
            .join('<br/>')
        );
      },
    },
    dataZoom,
  };
}
