import { EChartsOption } from 'echarts';

export const getOption = (
  zoom: number,
  legendData: string[] = [],
  xAxisData: string[] = [],
  series: EChartsOption['series'] = []
): EChartsOption => {
  function getValue(value: number) {
    return value * zoom;
  }

  const fontSize = getValue(12);

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
    },
    yAxis: {
      type: 'value',
      nameTextStyle: {
        fontSize,
      },
    },
    series,
    tooltip: {
      trigger: 'axis',
      textStyle: {
        fontSize,
      },
    },
    dataZoom: [
      {
        show: true,
        realtime: true,
        filterMode: 'empty',
        height: getValue(20),
        bottom: getValue(10),
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
