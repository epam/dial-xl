import { useCallback, useContext, useEffect, useState } from 'react';

import { GridViewportContext } from '../../../context';
import { ChartConfig } from '../types';

export const useHideCharts = (chartConfigs: ChartConfig[]) => {
  const { viewportEdges, gridViewportSubscriber } =
    useContext(GridViewportContext);
  const [hiddenCharts, setHiddenCharts] = useState<string[]>([]);

  const updateHiddenCharts = useCallback(() => {
    if (chartConfigs.length === 0) return;

    const {
      startCol: vStartCol,
      endCol: vEndCol,
      endRow: vEndRow,
      startRow: vStartRow,
    } = viewportEdges.current;

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
  }, [chartConfigs, viewportEdges]);

  useEffect(() => {
    updateHiddenCharts();

    const unsubscribe = gridViewportSubscriber.current.subscribe(() => {
      updateHiddenCharts();
    });

    return () => {
      unsubscribe();
    };
  }, [gridViewportSubscriber, updateHiddenCharts]);

  useEffect(() => {
    updateHiddenCharts();
  }, [updateHiddenCharts]);

  return {
    hiddenCharts,
  };
};
