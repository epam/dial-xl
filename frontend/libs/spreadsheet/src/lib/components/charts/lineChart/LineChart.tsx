import { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useState } from 'react';

import { ChartData } from '@frontend/common';

import { ChartConfig } from '../types';
import { getColor, getOption } from './chartOptions';

type Props = {
  chartConfig: ChartConfig;
  chartData: ChartData;
  zoom: number;
};

export function LineChart({ chartConfig, chartData, zoom }: Props) {
  const [chartOptions, setChartOptions] = useState<EChartsOption>(
    getOption(zoom)
  );

  useEffect(() => {
    if (chartData) {
      const data = chartData[chartConfig.tableName];

      if (!data) return;

      const legendData: string[] = [];
      const xAxisData: string[] = [];
      const seriesData: EChartsOption['series'] = [];

      for (const [key, item] of Object.entries(data)) {
        legendData.push(key);

        for (let i = 0; i < item.length; i++) {
          const points = item[i].points;

          for (const [pointKey] of Object.entries(points)) {
            xAxisData.push(pointKey);
          }
        }
      }

      legendData.sort((a, b) => a.localeCompare(b));
      xAxisData.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      for (const [key, item] of Object.entries(data)) {
        for (let i = 0; i < item.length; i++) {
          const points = item[i].points;

          const seriesDataArray = new Array(xAxisData.length).fill(null);
          for (const [pointKey, pointValue] of Object.entries(points)) {
            const index = xAxisData.indexOf(pointKey);

            if (index === -1 || index > seriesDataArray.length - 1) continue;

            seriesDataArray[index] = pointValue;
          }

          const legendIndex = legendData.indexOf(key);

          seriesData.push({
            name: key,
            type: 'line',
            data: seriesDataArray,
            connectNulls: true,
            color: getColor(legendIndex),
          });
        }
      }

      const optionsWithData = getOption(
        zoom,
        legendData,
        xAxisData,
        seriesData
      );
      setChartOptions(optionsWithData);

      return;
    }

    const options = getOption(zoom);
    setChartOptions(options);
  }, [chartConfig.tableName, chartData, zoom]);

  return (
    <ReactECharts
      lazyUpdate={true}
      notMerge={true}
      option={chartOptions}
      opts={{
        width: chartConfig.width,
        height: chartConfig.height,
      }}
      style={{ height: '100%' }}
    />
  );
}
