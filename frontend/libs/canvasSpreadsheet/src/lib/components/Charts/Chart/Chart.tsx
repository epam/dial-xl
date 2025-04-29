import { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';

import { AppTheme, ChartsData } from '@frontend/common';

import { ChartConfig } from '../types';
import { chartRegistry } from './chartRegistry';

const debounceDelay = 500;

type Props = {
  chartConfig: ChartConfig;
  chartData: ChartsData;
  theme: AppTheme;
  zoom: number;
  onSelectChart: () => void;
  onChartDblClick: () => void;
};

export function Chart({
  chartConfig,
  chartData,
  theme,
  zoom,
  onSelectChart,
  onChartDblClick,
}: Props) {
  const { chartType } = chartConfig.gridChart;
  const chartBuilder = chartRegistry[chartType];

  const [chartOptions, setChartOptions] = useState<EChartsOption>({});
  const debounceTimer = useRef<number | undefined>(undefined);

  const updatedChartOptions = useMemo(() => {
    const organizedData = chartBuilder.organizeData(chartData, chartConfig);

    if (!organizedData) {
      return chartBuilder.getOption({ theme, zoom });
    }

    return chartBuilder.getOption({ theme, zoom, ...organizedData });
  }, [chartData, chartConfig, theme, zoom, chartBuilder]);

  const onChartReady = useCallback(
    (chart: any) => {
      chart.getZr().on('click', () => {
        onSelectChart();
      });
      chart.getZr().on('dblclick', () => {
        onChartDblClick();
      });
    },
    [onSelectChart, onChartDblClick]
  );

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      setChartOptions((prevOptions) =>
        isEqual(prevOptions, updatedChartOptions)
          ? prevOptions
          : updatedChartOptions
      );
    }, debounceDelay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [updatedChartOptions]);

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
      onChartReady={onChartReady}
    />
  );
}
