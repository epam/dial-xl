import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { ChartType, GridChart } from '@frontend/common';

import { canvasId } from '../../../constants';
import { GridApi } from '../../../types';
import { getPx, snap } from '../../../utils';
import { filterSelectorNames } from '../toolBar';
import { ChartConfig } from '../types';

const toolbarRows = 2;
const titleRows = 2;
const minRows = 8;
const minCols = 7;

type UseChartsLayerArgs = {
  apiRef: RefObject<GridApi | null>;
  charts: GridChart[];
  zoom: number;
  columnSizes: Record<number, number>;
};

export function useChartsLayer({
  apiRef,
  charts,
  zoom,
  columnSizes,
}: UseChartsLayerArgs) {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseViewportRef = useRef<{ x: number; y: number } | null>(null);

  const computeChartConfigs = useCallback(() => {
    const api = apiRef.current;
    const currentGridSizes = apiRef.current?.gridSizes;
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
    const lineW = gridLine.width;

    const gx = (col: number) => snap(api.getCellX(col) - xOffset);
    const gy = (row: number) => snap(api.getCellY(row) - yOffset);

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
  }, [apiRef, charts]);

  const setLayerPosition = useCallback(() => {
    const api = apiRef.current;
    const currentGridSizes = apiRef.current?.gridSizes;
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
  }, [apiRef]);

  // Allow scrolling spreadsheet when the mouse is over charts
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const container = containerRef.current;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const isOverLineChart = !!target?.closest(
        `[data-chart-type="${ChartType.LINE}"]`,
      );

      const isZoomGesture = isOverLineChart && (e.ctrlKey || e.metaKey);

      if (isZoomGesture) return;

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
  }, [apiRef]);

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
    const api = apiRef.current;
    if (!api) return;

    const viewportUnsubscribe = api.gridViewportSubscription(() => {
      if (!containerRef.current || !baseViewportRef.current) return;

      const viewport = api.getViewportCoords();
      const { x: baseX, y: baseY } = baseViewportRef.current;
      const dx = snap(baseX - viewport.x1);
      const dy = snap(baseY - viewport.y1);

      containerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    return () => {
      viewportUnsubscribe();
    };
  }, [apiRef]);

  return {
    chartConfigs,
    viewportRef,
    containerRef,
  };
}
