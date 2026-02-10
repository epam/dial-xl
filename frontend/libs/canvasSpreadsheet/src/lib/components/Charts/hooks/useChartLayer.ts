import { useCallback, useEffect, useRef, useState } from 'react';

import { GridChart } from '@frontend/common';

import { canvasId } from '../../../constants';
import { GridApi } from '../../../types';
import { getPx, round } from '../../../utils';
import { filterSelectorNames } from '../toolBar';
import { ChartConfig } from '../types';

const toolbarRows = 2;
const titleRows = 2;
const minRows = 8;
const minCols = 7;

type UseChartsLayerArgs = {
  api: GridApi | null;
  charts: GridChart[];
  zoom: number;
  columnSizes: Record<number, number>;
};

export function useChartsLayer({
  api,
  charts,
  zoom,
  columnSizes,
}: UseChartsLayerArgs) {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseViewportRef = useRef<{ x: number; y: number } | null>(null);

  const currentGridSizes = api?.gridSizes;

  const computeChartConfigs = useCallback(() => {
    if (charts?.length === 0 || !api || !currentGridSizes) {
      baseViewportRef.current = null;
      setChartConfigs([]);

      return;
    }

    const viewport = api.getViewportCoords();
    baseViewportRef.current = {
      x: viewport.x1 ?? 0,
      y: viewport.y1 ?? 0,
    };

    const newChartConfigs: ChartConfig[] = [];
    const { rowNumber, colNumber, gridLine } = currentGridSizes;
    const xOffset = rowNumber.width;
    const yOffset = colNumber.height;
    const inset = gridLine.width;

    charts.forEach((chart) => {
      const { startCol, startRow, endRow, endCol, tableName } = chart;

      const showTitle = chart.showTitle ?? false;
      const showToolbar = filterSelectorNames(chart).length > 0;

      const finalTitleRows = showTitle ? titleRows : 0;
      const finalToolbarRows = showToolbar ? toolbarRows : 0;
      const totalHeaderRows = finalTitleRows + finalToolbarRows;

      // Chart body position (below title and toolbar)
      const x1 = api.getCellX(startCol) - xOffset + inset;
      const y1 = api.getCellY(startRow + totalHeaderRows) - yOffset + inset;

      const x2 = api.getCellX(endCol) - xOffset - inset;
      const y2 = api.getCellY(endRow) - yOffset - inset;

      // Top position (for title or toolbar)
      const x3 = api.getCellX(startCol) - xOffset + inset;
      const y3 = api.getCellY(startRow) - yOffset + inset;

      // Toolbar position (below title if both exist)
      const toolbarStartRow = startRow + finalTitleRows;
      const yToolbar = api.getCellY(toolbarStartRow) - yOffset + inset;

      // Title position
      const yTitle = y3;

      const x4 = api.getCellX(startCol + minCols) - xOffset - inset;
      const y4 = api.getCellY(startRow + minRows) - yOffset - inset;

      const width = round(Math.abs(x2 - x1));
      const height = round(Math.abs(y2 - y1));

      const titleHeight = showTitle ? round(Math.abs(yToolbar - yTitle)) : 0;
      const toolBarHeight = showToolbar ? round(Math.abs(y1 - yToolbar)) : 0;

      const minResizeWidth = Math.min(round(Math.abs(x4 - x3)), width);
      const minResizeHeight = Math.min(round(Math.abs(y4 - y3)), height);

      newChartConfigs.push({
        left: round(x1),
        top: round(y1),
        width,
        height,
        toolBarHeight,
        toolBarTop: round(yToolbar),
        toolBarLeft: round(x3),
        titleHeight,
        titleTop: round(yTitle),
        titleLeft: round(x3),
        minResizeWidth,
        minResizeHeight,
        tableName,
        showToolbar,
        showTitle,
        gridChart: chart,
      });
    });

    setChartConfigs(newChartConfigs);

    if (containerRef.current) {
      containerRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  }, [api, charts, currentGridSizes]);

  const setLayerPosition = useCallback(() => {
    if (!api) return;

    const dataContainer = document.getElementById(canvasId);

    if (
      !dataContainer ||
      !viewportRef.current ||
      !containerRef.current ||
      !currentGridSizes
    )
      return;

    const { width, height, top, left } = dataContainer.getBoundingClientRect();
    const { scrollBar, rowNumber, colNumber } = currentGridSizes;
    const { trackSize } = scrollBar;
    const containerWidth = round(width - rowNumber.width - trackSize);
    const containerHeight = round(height - colNumber.height - trackSize);
    const translateX = round(left + rowNumber.width);
    const translateY = round(top + rowNumber.height);
    viewportRef.current.style.transform = `translate(${getPx(
      translateX
    )}, ${getPx(translateY)})`;
    viewportRef.current.style.width = getPx(containerWidth);
    viewportRef.current.style.height = getPx(containerHeight);
    containerRef.current.style.width = getPx(containerWidth);
    containerRef.current.style.height = getPx(containerHeight);

    if (containerWidth <= 0 || containerHeight <= 0) {
      viewportRef.current.style.display = 'none';
    } else {
      viewportRef.current.style.display = 'block';
    }
  }, [api, currentGridSizes]);

  // Allow scrolling spreadsheet when the mouse is over charts
  useEffect(() => {
    if (!api) return;

    const container = containerRef.current;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY) {
        api.moveViewport(0, e.deltaY / 2);
      } else if (e.deltaX) {
        api.moveViewport(e.deltaX, 0);
      }

      e.preventDefault();
    };
    container?.addEventListener('wheel', onWheel, true);

    return () => {
      container?.removeEventListener('wheel', onWheel, true);
    };
  }, [api]);

  useEffect(() => {
    setLayerPosition();
  }, [setLayerPosition]);

  useEffect(() => {
    const container = document.getElementById(canvasId);
    if (!container) return;

    const observer = new ResizeObserver(setLayerPosition);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [setLayerPosition]);

  useEffect(() => {
    setTimeout(() => {
      computeChartConfigs();
    });
  }, [zoom, charts, columnSizes, computeChartConfigs]);

  useEffect(() => {
    if (!api) return;

    const viewportUnsubscribe = api.gridViewportSubscription(() => {
      if (!containerRef.current || !baseViewportRef.current) return;

      const viewport = api.getViewportCoords();
      const { x: baseX, y: baseY } = baseViewportRef.current;
      const dx = baseX - viewport.x1;
      const dy = baseY - viewport.y1;

      containerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    return () => {
      viewportUnsubscribe();
    };
  }, [api]);

  return {
    chartConfigs,
    viewportRef,
    containerRef,
  };
}
