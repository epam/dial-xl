import { useCallback, useEffect, useState } from 'react';

import { GridApi } from '../../types';
import { ChartConfig } from './types';

export const useHideCharts = (
  api: GridApi | null,
  chartConfig: ChartConfig[],
  viewportNode: HTMLDivElement | null,
  containerNode: HTMLDivElement | null
) => {
  const [hiddenCharts, setHiddenCharts] = useState<string[]>([]);

  const updateHiddenCharts = useCallback(() => {
    if (!containerNode || !viewportNode) return;

    const hiddenCharts: string[] = [];
    const { height, width } = viewportNode.getBoundingClientRect();
    const { m41: translateX, m42: translateY } = new DOMMatrixReadOnly(
      containerNode.style.transform
    );
    const viewportTop = Math.abs(translateY);
    const viewportBottom = viewportTop + height;
    const viewportLeft = Math.abs(translateX);
    const viewportRight = viewportLeft + width;

    for (const chart of chartConfig) {
      const { left, top, width, height, tableName } = chart;

      const chartBottom = top + height;
      const chartRight = left + width;

      if (
        chartBottom < viewportTop ||
        top > viewportBottom ||
        chartRight < viewportLeft ||
        left > viewportRight
      ) {
        hiddenCharts.push(tableName);
      }
    }

    setHiddenCharts(hiddenCharts);
  }, [chartConfig, containerNode, viewportNode]);

  useEffect(() => {
    if (!api) return;

    // setTimeout to wait when viewportNode changes its size (e.g. after panel collapse) to calculate hidden charts properly
    const unsubscribe = api.gridViewportSubscription(() =>
      setTimeout(() => updateHiddenCharts(), 0)
    );

    return () => {
      unsubscribe();
    };
  }, [api, updateHiddenCharts]);

  return {
    hiddenCharts,
  };
};
