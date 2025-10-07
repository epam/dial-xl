import { EChartsOption } from 'echarts';

import { ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  isHtmlColor,
  sortNumericOrText,
} from '../common';

export function organizeStackedBarChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const data = chartData[chartConfig.tableName];
  const { gridChart } = chartConfig;
  const { chartSections, customSeriesColors, showLegend, chartOrientation } =
    gridChart;

  if (
    !data ||
    !Object.keys(data).length ||
    !chartSections ||
    !chartSections.length
  )
    return;

  const legendData: string[] = [];
  const xAxisData: string[] = [];
  const xDisplayByRaw = new Map<string, string>();
  const series: EChartsOption['series'] = [];

  for (const section of chartSections) {
    const { xAxisFieldName, valueFieldNames } = section;
    if (!valueFieldNames?.length) continue;

    const rowCount = Array.isArray(data[valueFieldNames[0]]?.rawValues)
      ? data[valueFieldNames[0]].rawValues.length
      : 0;

    const rowNumbers = Array.from({ length: rowCount }, (_, i) =>
      (i + 1).toString()
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

    if (chartOrientation === 'vertical') {
      // For custom x-axis labels, sort the row numbers accordingly
      let sortedRowNumbers = [...rowNumbers];
      let sortedLabels = [...rowLabels];

      if (rowLabels.length && xAxisFieldName) {
        // Create pairs of [label, rowNumber] for sorting
        const labelRowPairs = rowLabels.map((label, idx) => ({
          label,
          rowNumber: rowNumbers[idx],
        }));

        // Sort by labels
        labelRowPairs.sort((a, b) => {
          const sorted = sortNumericOrText([a.label, b.label]);

          return sorted[0] === a.label ? -1 : 1;
        });

        // Extract sorted arrays
        sortedLabels = labelRowPairs.map((pair) => pair.label);
        sortedRowNumbers = labelRowPairs.map((pair) => pair.rowNumber);

        // Add sorted labels to xAxisData
        if (!xAxisData.length) {
          xAxisData.push(...sortedLabels);
        }
      } else if (!xAxisData.length) {
        // If no custom labels, just use row numbers
        xAxisData.push(...rowNumbers);
      }

      for (const fieldName of sortNumericOrText(valueFieldNames)) {
        legendData.push(fieldName);

        const fieldValues = data[fieldName]?.rawValues;
        const fieldValuesDisplay = data[fieldName]?.displayValues;
        if (!Array.isArray(fieldValues)) return;

        const values = sortedRowNumbers.map((row) => {
          const idx = Number(row) - 1;
          const n = parseFloat(fieldValues[idx] as string);
          const disp = fieldValuesDisplay[idx];

          return isNaN(n) ? null : { value: n, displayValue: disp };
        });

        const cIdx = legendData.indexOf(fieldName);
        series.push({
          name: fieldName,
          type: 'bar',
          stack: 'stack',
          data: values,
          itemStyle: {
            color:
              customSeriesColors?.[fieldName] ||
              getColor(cIdx === -1 ? 0 : cIdx, fieldName),
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

      for (let r = 0; r < rowCount; r++) {
        const rowName = rowLabels[r] ?? `Row ${r + 1}`;
        legendData.push(rowName);

        const values = valueFieldNames.map((field) => {
          const n = parseFloat(data[field]?.rawValues?.[r] as string);
          const disp = data[field]?.displayValues?.[r];

          return isNaN(n) ? null : { value: n, displayValue: disp };
        });

        const cIdx = legendData.indexOf(rowName);
        const colorCandidate = dotColors?.[r];
        const rowColor =
          colorCandidate && isHtmlColor(colorCandidate)
            ? colorCandidate
            : customSeriesColors?.[rowName] ||
              getColor(cIdx === -1 ? 0 : cIdx, rowName);

        series.push({
          name: rowName,
          type: 'bar',
          stack: 'stack',
          data: values,
          itemStyle: {
            color: rowColor,
          },
        });
      }
    }
  }

  const uniqueXAxisData = addLineBreaks(
    [...new Set(xAxisData)]
      .filter(Boolean)
      .map((raw) => xDisplayByRaw.get(raw) ?? raw)
  );

  return {
    showLegend,
    legendData: [...new Set(legendData)],
    series,
    xAxisData: uniqueXAxisData,
  };
}

export function getStackedBarChartOption({
  series,
  xAxisData,
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
      left: showLegend ? getValue(120) : getValue(10),
      top: getValue(20),
      right: getValue(10),
      bottom: getValue(20),
      containLabel: true,
    },
    xAxis: {
      type: 'value',
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
      data: xAxisData,
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
        return params
          .map(
            ({ marker, data, seriesName }: any) =>
              `${marker}${seriesName}<span style="float: right; margin-left: 20px"><b>${
                data?.displayValue || data?.value || ''
              }</b></span>`
          )
          .join('<br/>');
      },
    },
  };
}
