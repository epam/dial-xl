import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { ChartType, GridChart } from '@frontend/common';

import { GridStateContext, GridViewportContext } from '../../../context';
import { getPx, snap } from '../../../utils';
import { filterSelectorNames } from '../toolBar';
import { ChartConfig } from '../types';

const toolbarRows = 2;
const titleRows = 2;
const minRows = 8;
const minCols = 7;

type UseChartsLayerArgs = {
  charts: GridChart[];
  columnSizes: Record<number, number>;
};

export function useChartsLayer({ charts, columnSizes }: UseChartsLayerArgs) {
  const { zoom, gridSizes, canvasId } = useContext(GridStateContext);
  const {
    viewportCoords,
    getCellX,
    getCellY,
    gridViewportSubscriber,
    moveViewport,
  } = useContext(GridViewportContext);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseViewportRef = useRef<{ x: number; y: number } | null>(null);

  const computeChartConfigs = useCallback(() => {
    if (charts?.length === 0) {
      baseViewportRef.current = null;
      setChartConfigs([]);

      return;
    }

    const viewport = viewportCoords.current;
    baseViewportRef.current = {
      x: viewport.x1 ?? 0,
      y: viewport.y1 ?? 0,
    };

    const newChartConfigs: ChartConfig[] = [];
    const { rowNumber, colNumber, gridLine } = gridSizes;
    const xOffset = rowNumber.width;
    const yOffset = colNumber.height;
    const lineW = gridLine.width;

    const gx = (col: number) => snap(getCellX(col) - xOffset);
    const gy = (row: number) => snap(getCellY(row) - yOffset);

    charts.forEach((chart) => {
      const { startCol, startRow, endRow, endCol, tableName } = chart;

      const showTitle = chart.showTitle ?? false;
      const showToolbar = filterSelectorNames(chart).length > 0;

      const finalTitleRows = showTitle ? titleRows : 0;
      const finalToolbarRows = showToolbar ? toolbarRows : 0;
      const totalHeaderRows = finalTitleRows + finalToolbarRows;

      // Outer boundaries
      const outerLeft = gx(startCol) - lineW;
      const outerTop = gy(startRow);
      const outerRight = gx(endCol) - lineW / 2;
      const outerBottom = gy(endRow) + lineW / 2;

      // Body block
      const bodyTop = gy(startRow + totalHeaderRows);
      const bodyLeft = outerLeft;
      const bodyRight = outerRight;
      const bodyBottom = outerBottom;

      // Body dimensions
      const width = snap(Math.max(0, bodyRight - bodyLeft));
      const height = snap(Math.max(0, bodyBottom - bodyTop));

      // Title block
      const titleTop = outerTop;
      const titleBottom = showTitle ? gy(startRow + finalTitleRows) : outerTop;
      const titleHeight = snap(Math.max(0, titleBottom - titleTop));

      // Toolbar block
      const toolBarTop = showTitle ? titleBottom : outerTop;
      const toolBarBottom = showToolbar
        ? gy(startRow + totalHeaderRows)
        : toolBarTop;
      const toolBarHeight = snap(Math.max(0, toolBarBottom - toolBarTop));

      // Min resize constraints
      const minRight = gx(startCol + minCols);
      const minBottom = gy(startRow + minRows);
      const minResizeWidth = snap(
        Math.min(Math.max(0, minRight - outerLeft), width),
      );
      const outerHeight = snap(Math.max(0, outerBottom - outerTop));
      const minResizeHeight = snap(
        Math.min(Math.max(0, minBottom - outerTop), outerHeight),
      );

      newChartConfigs.push({
        left: bodyLeft,
        top: bodyTop,
        width,
        height,

        toolBarHeight,
        toolBarTop: snap(toolBarTop),
        toolBarLeft: snap(outerLeft),

        titleHeight,
        titleTop: snap(titleTop),
        titleLeft: snap(outerLeft),

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
  }, [charts, getCellX, getCellY, gridSizes, viewportCoords]);

  const setLayerPosition = useCallback(() => {
    const dataContainer = document.getElementById(canvasId);

    if (
      !dataContainer ||
      !viewportRef.current ||
      !containerRef.current ||
      !gridSizes
    )
      return;

    const { width, height, top, left } = dataContainer.getBoundingClientRect();
    const { scrollBar, rowNumber, colNumber } = gridSizes;
    const { trackSize } = scrollBar;
    const containerWidth = snap(width - rowNumber.width - trackSize);
    const containerHeight = snap(height - colNumber.height - trackSize);
    const translateX = snap(left + rowNumber.width);
    const translateY = snap(top + rowNumber.height);
    viewportRef.current.style.transform = `translate(${getPx(
      translateX,
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
  }, [canvasId, gridSizes]);

  // Allow scrolling spreadsheet when the mouse is over charts
  useEffect(() => {
    const container = containerRef.current;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const isOverLineChart = !!target?.closest(
        `[data-chart-type="${ChartType.LINE}"]`,
      );

      const isZoomGesture = isOverLineChart && (e.ctrlKey || e.metaKey);

      if (isZoomGesture) return;

      if (e.deltaY) {
        moveViewport(0, e.deltaY / 2);
      } else if (e.deltaX) {
        moveViewport(e.deltaX, 0);
      }

      e.preventDefault();
    };
    container?.addEventListener('wheel', onWheel, true);

    return () => {
      container?.removeEventListener('wheel', onWheel, true);
    };
  }, [moveViewport]);

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
  }, [canvasId, setLayerPosition]);

  useEffect(() => {
    setTimeout(() => {
      computeChartConfigs();
    });
  }, [zoom, charts, columnSizes, computeChartConfigs]);

  useEffect(() => {
    const viewportUnsubscribe = gridViewportSubscriber.current.subscribe(() => {
      if (!containerRef.current || !baseViewportRef.current) return;

      const viewport = viewportCoords.current;
      const { x: baseX, y: baseY } = baseViewportRef.current;
      const dx = snap(baseX - viewport.x1);
      const dy = snap(baseY - viewport.y1);

      containerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    return () => {
      viewportUnsubscribe();
    };
  }, [gridViewportSubscriber, viewportCoords]);

  return {
    chartConfigs,
    viewportRef,
    containerRef,
  };
}
