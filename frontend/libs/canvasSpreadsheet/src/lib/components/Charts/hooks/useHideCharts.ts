import { useCallback, useEffect, useState } from 'react';

import { GridApi } from '../../../types';
import { ChartConfig } from '../types';

export const useHideCharts = (
  api: GridApi | null,
  chartConfigs: ChartConfig[]
) => {
  const [hiddenCharts, setHiddenCharts] = useState<string[]>([]);

  const updateHiddenCharts = useCallback(() => {
    if (!api || chartConfigs.length === 0) return;

    const {
      startCol: vStartCol,
      endCol: vEndCol,
      endRow: vEndRow,
      startRow: vStartRow,
    } = api.getViewportEdges();

    const hidden: string[] = [];

    for (const chart of chartConfigs) {
      const { tableName, gridChart } = chart;
      const { startCol, startRow, endCol, endRow } = gridChart;

      const isOutside =
        endCol < vStartCol ||
        startCol > vEndCol ||
        endRow < vStartRow ||
        startRow > vEndRow;

      if (isOutside) {
        hidden.push(tableName);
      }
    }

    setHiddenCharts(hidden);
  }, [api, chartConfigs]);

  useEffect(() => {
    if (!api) return;

    updateHiddenCharts();

    const unsubscribe = api.gridViewportSubscription(() => {
      updateHiddenCharts();
    });

    return () => {
      unsubscribe();
    };
  }, [api, updateHiddenCharts]);

  useEffect(() => {
    updateHiddenCharts();
  }, [updateHiddenCharts]);

  return {
    hiddenCharts,
  };
};
