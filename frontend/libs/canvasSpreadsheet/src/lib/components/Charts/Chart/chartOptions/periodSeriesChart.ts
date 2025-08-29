import { EChartsOption } from 'echarts';

import { ChartsData, PeriodSeries } from '@frontend/common';

import { ChartConfig } from '../../types';
import { GetOptionProps, OrganizedData } from '../chartRegistry';
import { getColor, getThemeColors } from '../common';

export function organizePeriodSeriesChartData(
  chartData: ChartsData,
  chartConfig: ChartConfig
): OrganizedData | undefined {
  const { tableName, gridChart } = chartConfig;
  const { showLegend, customSeriesColors } = gridChart;
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
  zoom,
  theme,
  showLegend,
}: GetOptionProps): EChartsOption {
  function getValue(value: number) {
    return value * zoom;
  }

  const fontSize = getValue(12);
  const { textColor, borderColor, bgColor, hoverColor } = getThemeColors(theme);

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
      left: showLegend ? getValue(130) : getValue(10),
      top: getValue(30),
      right: getValue(20),
      bottom: getValue(40),
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
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
    },
    dataZoom: [
      {
        show: true,
        realtime: true,
        filterMode: 'empty',
        height: getValue(20),
        bottom: getValue(10),
        textStyle: {
          fontSize,
        },
        emphasis: {
          moveHandleStyle: {
            color: hoverColor,
          },
        },
      },
      {
        type: 'inside',
        realtime: true,
        filterMode: 'empty',
        height: getValue(20),
        bottom: getValue(10),
      },
    ],
  };
}
