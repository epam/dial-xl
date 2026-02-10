import { EChartsOption } from 'echarts';
import ReactECharts, { EChartsInstance } from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import isEqual from 'react-fast-compare';

import {
  AppTheme,
  ChartsData,
  GridChart,
  normalizeForCompare,
} from '@frontend/common';

import { chartRegistry } from './chartRegistry';

const debounceDelay = 500;

type Props = {
  gridChart: GridChart;
  chartData: ChartsData;
  theme: AppTheme;
  zoom: number;
  width: number;
  height: number;
  onSelectChart: () => void;
  onChartDblClick: () => void;
  onEchartsMouseDown: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export const Chart = React.memo(function Chart({
  gridChart,
  chartData,
  theme,
  zoom,
  width,
  height,
  onSelectChart,
  onChartDblClick,
  onEchartsMouseDown,
}: Props) {
  const chartBuilder = useMemo(
    () => chartRegistry[gridChart.chartType],
    [gridChart.chartType]
  );

  const [chartOptions, setChartOptions] = useState<EChartsOption>({});

  const debounceTimer = useRef<number | undefined>(undefined);
  const instanceRef = useRef<EChartsInstance | null>(null);

  const updatedChartOptions = useMemo(() => {
    const organizedData = chartBuilder.organizeData(chartData, gridChart);

    if (!organizedData) {
      return chartBuilder.getOption({ theme, zoom });
    }

    return chartBuilder.getOption({ theme, zoom, ...organizedData });
  }, [chartData, gridChart, theme, zoom, chartBuilder]);

  const onChartReady = useCallback(
    (chart: EChartsInstance) => {
      instanceRef.current = chart;

      chart.getZr().on('click', () => {
        onSelectChart();
      });
      chart.getZr().on('dblclick', () => {
        onChartDblClick();
      });

      chart.getZr().on('mousedown', (params: any) => {
        if (params.target) return;

        onEchartsMouseDown(params.event);
      });
    },
    [onSelectChart, onChartDblClick, onEchartsMouseDown]
  );

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      setChartOptions((prevOptions) =>
        isEqual(
          normalizeForCompare(prevOptions),
          normalizeForCompare(updatedChartOptions)
        )
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
        width,
        height,
      }}
      style={{ height: '100%' }}
      onChartReady={onChartReady}
    />
  );
});
