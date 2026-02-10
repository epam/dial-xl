import { EChartsOption, XAXisComponentOption } from 'echarts';

import { ChartsData, GridChart, GridChartSection } from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  sortNumericOrText,
} from '../common';

type SectionPrepared = {
  section: GridChartSection;
  sectionXAxisData: string[];
  sectionXAxisDisp?: string[];
};

const defaultDotSize = 10;

export function organizeScatterPlotChartData(
  chartData: ChartsData,
  gridChart: GridChart
): OrganizedData | undefined {
  const {
    chartSections,
    customSeriesColors,
    legendPosition,
    showLegend,
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
  const preparedSections: SectionPrepared[] = [];

  for (const section of chartSections) {
    const { valueFieldNames, xAxisFieldName } = section;

    if (!valueFieldNames.length) continue;

    legendData.push(...valueFieldNames);

    if (!data[valueFieldNames[0]]) return;

    const sectionXAxisData =
      xAxisFieldName && data[xAxisFieldName]
        ? (data[xAxisFieldName].rawValues as string[])
        : Array.from(
            { length: data[valueFieldNames[0]]?.rawValues.length },
            (_, i) => (i + 1).toString()
          );

    const sectionXAxisDisp: string[] | undefined =
      xAxisFieldName && data[xAxisFieldName]
        ? (data[xAxisFieldName].displayValues as string[])
        : undefined;

    sectionXAxisData.forEach((raw, i) => {
      xAxisValuesSet.add(raw);

      if (!xDisplayByRaw.has(raw)) {
        xDisplayByRaw.set(raw, sectionXAxisDisp?.[i] ?? raw);
      }
    });

    preparedSections.push({
      section,
      sectionXAxisData,
      sectionXAxisDisp,
    });
  }

  const allRawX = Array.from(xAxisValuesSet);
  const isNumericXAxis =
    allRawX.length > 0 &&
    allRawX.every((raw) => raw !== '' && !Number.isNaN(Number(raw)));

  let xAxisRawSorted: string[] = [];
  let xIndexByRaw: Map<string, number> | undefined;

  if (!isNumericXAxis) {
    xAxisRawSorted = sortNumericOrText(allRawX);
    xIndexByRaw = new Map<string, number>(
      xAxisRawSorted.map((r, idx) => [r, idx])
    );
  }

  for (const {
    section,
    sectionXAxisData,
    sectionXAxisDisp,
  } of preparedSections) {
    const { valueFieldNames } = section;

    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      if (!data[valueFieldName] || !data[valueFieldName].rawValues) continue;

      const seriesYData = data[valueFieldName].rawValues as string[];
      const displaySeriesYData = data[valueFieldName].displayValues as string[];
      const dotSizeField = section.dotSizeFieldName
        ? (data[section.dotSizeFieldName].rawValues as string[])
        : undefined;
      const dotColorField = section.dotColorFieldName
        ? (data[section.dotColorFieldName].rawValues as string[])
        : undefined;

      const legendIndex = legendData.indexOf(valueFieldName);

      if (!seriesYData || seriesYData.length < sectionXAxisData.length)
        continue;

      const scatterData = sectionXAxisData.map((xRaw, index) => {
        let xValue: number | null = null;

        if (isNumericXAxis) {
          const parsed = Number(xRaw);
          xValue = Number.isNaN(parsed) ? null : parsed;
        } else if (xIndexByRaw) {
          xValue = xIndexByRaw.get(xRaw) ?? null;
        }

        const yRaw = seriesYData[index];
        const yValue =
          yRaw === null || yRaw === undefined || yRaw === ''
            ? null
            : Number(yRaw);

        return {
          value: [xValue, yValue],
          displayValue: [
            sectionXAxisDisp?.[index] ?? xRaw,
            displaySeriesYData[index],
          ],
          symbolSize: dotSizeField
            ? parseFloat(dotSizeField[index]) || defaultDotSize
            : defaultDotSize,
          itemStyle: {
            color:
              dotColorField?.[index] ||
              customSeriesColors?.[valueFieldName] ||
              getColor(legendIndex),
          },
        };
      });

      series.push({
        name: valueFieldName,
        type: 'scatter',
        data: scatterData,
        itemStyle: {
          color:
            customSeriesColors?.[valueFieldName] ||
            getColor(legendIndex, valueFieldName),
        },
      });
    }
  }

  let xAxisData: string[] | undefined;
  if (!isNumericXAxis) {
    const xAxisDisplayData = xAxisRawSorted.map(
      (raw) => xDisplayByRaw.get(raw) ?? raw
    );
    xAxisData = addLineBreaks(xAxisDisplayData);
  }

  return {
    showLegend,
    legendPosition,
    legendData,
    series,
    xAxisData,
    isNumericXAxis,
  };
}

export function getScatterPlotChartOption({
  series,
  xAxisData,
  legendData,
  legendPosition,
  zoom,
  theme,
  showLegend,
  isNumericXAxis,
}: GetOptionProps): EChartsOption {
  function z(value: number) {
    return value * zoom;
  }

  const fontSize = z(12);
  const { textColor, borderColor, bgColor } = getThemeColors(theme);
  let xAxis: XAXisComponentOption;

  if (isNumericXAxis) {
    xAxis = {
      type: 'value',
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        color: textColor,
        fontSize,
      },
    };
  } else {
    xAxis = {
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
      axisTick: {
        alignWithLabel: true,
      },
    };
  }

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
        if (!params || !params.length) return '';

        const first = params[0];
        const xDisplay = first.data?.displayValue?.[0] ?? first.axisValue ?? '';
        const axisLabel = xDisplay ? `${xDisplay}</br>` : '';

        return (
          axisLabel +
          params
            .map(
              ({ marker, data, seriesName }: any) =>
                `${marker}${seriesName}<span style="float: right; margin-left: 20px"><b>${
                  data?.displayValue?.[1] || data?.value?.[1] || ''
                }</b></span>`
            )
            .join('<br/>')
        );
      },
    },
  };
}
