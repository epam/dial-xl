import { EChartsOption } from 'echarts';

import { ChartsData, GridChart, PeriodSeries } from '@frontend/common';

import { buildLayout } from '../buildLayout';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { getColor, getThemeColors } from '../common';

export function organizePeriodSeriesChartData(
  chartData: ChartsData,
  gridChart: GridChart
): OrganizedData | undefined {
  const {
    showLegend,
    customSeriesColors,
    legendPosition,
    showVisualMap,
    tableName,
  } = gridChart;
  const data = chartData[tableName];

  if (!data) return;

  const legendData: string[] = [];
  const xAxisData: string[] = [];
  const series: EChartsOption['series'] = [];

  for (const [key, item] of Object.entries(data)) {
    legendData.push(key);

    for (let i = 0; i < item.rawValues.length; i++) {
      const points = (item.rawValues as PeriodSeries[])[i].points;

      if (!points) continue;

      for (const [pointKey] of Object.entries(points)) {
        xAxisData.push(pointKey);
      }
    }
  }

  legendData.sort((a, b) => a.localeCompare(b));
  xAxisData.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  for (const [key, item] of Object.entries(data)) {
    for (let i = 0; i < item.rawValues.length; i++) {
      const points = (item.rawValues as PeriodSeries[])[i].points;

      if (!points) continue;

      const seriesDataArray = new Array(xAxisData.length).fill(null);
      for (const [pointKey, pointValue] of Object.entries(points)) {
        const index = xAxisData.indexOf(pointKey);

        if (index === -1 || index > seriesDataArray.length - 1) continue;

        seriesDataArray[index] = pointValue;
      }

      const legendIndex = legendData.indexOf(key);
      const customSeriesColor = customSeriesColors?.[key];

      series.push({
        name: key,
        type: 'line',
        data: seriesDataArray,
        connectNulls: true,
        color: customSeriesColor ? customSeriesColor : getColor(legendIndex),
      });
    }
  }

  return {
    legendPosition,
    showVisualMap,
    showLegend,
    legendData,
    series,
    xAxisData,
  };
}

export function getPeriodSeriesChartOption({
  series,
  xAxisData,
  legendData,
  legendPosition,
  zoom,
  theme,
  showLegend,
  showVisualMap,
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
