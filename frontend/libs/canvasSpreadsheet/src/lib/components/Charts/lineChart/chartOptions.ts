import { EChartsOption } from 'echarts';

import { AppTheme } from '@frontend/common';

export const getOption = (
  theme: AppTheme,
  zoom: number,
  legendData: string[] = [],
  xAxisData: string[] = [],
  series: EChartsOption['series'] = []
): EChartsOption => {
  function getValue(value: number) {
    return value * zoom;
  }

  const fontSize = getValue(12);
  const textColor = theme === AppTheme.ThemeDark ? '#f3f4f6' : '#141a23';
  const bgColor = theme === AppTheme.ThemeDark ? '#222932' : '#fcfcfc';
  const borderColor = theme === AppTheme.ThemeDark ? '#222932' : '#dde1e6';
  const hoverColor = theme === AppTheme.ThemeDark ? '#333942' : '#dde1e6';

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
    },
    grid: {
      borderColor: '#ccc',
      left: getValue(120),
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
      },
    },
    yAxis: {
      type: 'value',
      nameTextStyle: {
        fontSize,
      },
      axisLabel: {
        color: textColor,
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
        fontSize,
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
};

const colorPalette = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
];

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

export function getColor(index: number) {
  if (index < 0 || index >= colorPalette.length) return getRandomColor();

  return colorPalette[index];
}
