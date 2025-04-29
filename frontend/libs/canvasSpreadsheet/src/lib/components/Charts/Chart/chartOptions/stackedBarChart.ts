import { EChartsOption } from 'echarts';

import { ChartsData } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import {
  addLineBreaks,
  getColor,
  getThemeColors,
  sortNumericOrText,
} from '../common';

export function organizeStackedBarChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const data = chartData[chartConfig.tableName];
  const { gridChart } = chartConfig;
  const { chartSections, customSeriesColors, showLegend } = gridChart;

  if (
    !data ||
    !Object.keys(data).length ||
    !chartSections ||
    !chartSections.length
  )
    return;

  const legendData: string[] = [];
  const xAxisData: string[] = [];
  const series: EChartsOption['series'] = [];

  for (const section of chartSections) {
    const { xAxisFieldName, valueFieldNames } = section;

    if (!Array.isArray(valueFieldNames) || valueFieldNames.length === 0) {
      continue;
    }

    const rowNumbers: string[] = [];

    if (data[section.valueFieldNames[0]]) {
      const sectionLength = data[section.valueFieldNames[0]].length;
      Array.from({ length: sectionLength }, (_, i) =>
        (i + 1).toString()
      ).forEach((value) => rowNumbers.push(value));
    }

    if (!rowNumbers.length) continue;

    if (xAxisFieldName) {
      const xFieldValues = data[xAxisFieldName];
      if (Array.isArray(xFieldValues)) {
        xAxisData.push(...(xFieldValues as string[]));
      }
    }

    if (!xAxisData.length) {
      xAxisData.push(...rowNumbers);
    }

    for (const valueFieldName of sortNumericOrText(valueFieldNames)) {
      legendData.push(valueFieldName);

      const fieldValues = data[valueFieldName];
      if (!Array.isArray(fieldValues)) {
        return;
      }

      const seriesData = rowNumbers.map((row) => {
        const rowIndex = parseInt(row, 10) - 1;
        if (rowIndex < 0 || rowIndex >= fieldValues.length) {
          return null;
        }

        const rawValue = fieldValues[rowIndex];
        const numericValue = parseFloat(rawValue as string);

        return isNaN(numericValue) ? null : numericValue;
      });

      const colorIndex = legendData.indexOf(valueFieldName);
      series.push({
        name: valueFieldName,
        type: 'bar',
        stack: 'stack',
        data: seriesData,
        itemStyle: {
          color:
            customSeriesColors?.[valueFieldName] ||
            getColor(colorIndex === -1 ? 0 : colorIndex, valueFieldName),
        },
      });
    }
  }

  const uniqueXAxisData = addLineBreaks(
    sortNumericOrText(Array.from(new Set(xAxisData)).filter(Boolean))
  );

  return {
    showLegend,
    legendData,
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
    },
  };
}
