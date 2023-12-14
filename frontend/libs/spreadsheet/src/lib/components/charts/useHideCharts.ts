import { useEffect, useState } from 'react';
import { debounceTime } from 'rxjs/operators';

import { Grid } from '../../grid';
import { ChartConfig } from './types';

export const useHideCharts = (
  api: Grid | null,
  chartConfig: ChartConfig[],
  viewportNode: HTMLDivElement | null,
  containerNode: HTMLDivElement | null
) => {
  const [hiddenCharts, setHiddenCharts] = useState<string[]>([]);

  useEffect(() => {
    const scrollSubscription = api?.scroll$
      .pipe(debounceTime(100))
      .subscribe(() => {
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
      });

    return () => {
      scrollSubscription?.unsubscribe();
    };
  }, [api, chartConfig, containerNode, viewportNode]);

  return {
    hiddenCharts,
  };
};
