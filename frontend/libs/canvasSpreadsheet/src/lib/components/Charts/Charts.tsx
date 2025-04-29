import { useCallback, useEffect, useRef, useState } from 'react';

import { canvasId } from '../../constants';
import {
  filterByTypeAndCast,
  getMousePosition,
  getPx,
  round,
} from '../../utils';
import {
  EventTypeStartMoveMode,
  EventTypeStopMoveMode,
  GridEvent,
} from '../GridApiWrapper';
import { Chart, EmptyChart } from './Chart';
import { ResizeHandler } from './resizeHandler';
import { filterSelectorNames, ToolBar } from './toolBar';
import { ChartConfig, Props } from './types';
import { useHideCharts } from './useHideCharts';

const toolbarRows = 2;

export function Charts({
  gridCallbacksRef,
  api,
  chartData = {},
  charts = [],
  zoom = 1,
  theme,
  columnSizes,
  tableStructure,
  parsedSheets,
}: Props) {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [moveMode, setMoveMode] = useState(false);
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [resizingChart, setResizingChart] = useState<string | null>(null);
  const viewportNode = useRef<HTMLDivElement>(null);
  const containerNode = useRef<HTMLDivElement>(null);

  const { hiddenCharts } = useHideCharts(
    api,
    chartConfigs,
    viewportNode.current,
    containerNode.current
  );

  const setupCharts = useCallback(() => {
    if (charts?.length === 0 || !api) {
      setChartConfigs([]);

      return;
    }

    const newChartStyles: ChartConfig[] = [];
    const minRows = 8;
    const minCols = 7;
    const gridSizes = api.getGridSizes();
    const { rowNumber, colNumber } = gridSizes;
    const xOffset = rowNumber.width;
    const yOffset = colNumber.height;

    charts.forEach((chart) => {
      const { startCol, startRow, endRow, endCol, tableName } = chart;

      const showToolbar = filterSelectorNames(chart).length > 0;
      const finalToolbarRows = showToolbar ? toolbarRows : 0;

      const x1 = api.getCellX(startCol) - xOffset;
      const y1 = api.getCellY(startRow + finalToolbarRows) - yOffset;

      const x2 = api.getCellX(endCol) - xOffset;
      const y2 = api.getCellY(endRow) - yOffset;

      const x3 = api.getCellX(startCol) - xOffset;
      const y3 = api.getCellY(startRow) - yOffset;

      const x4 = api.getCellX(startCol + minCols) - xOffset;
      const y4 = api.getCellY(startRow + minRows) - yOffset;

      const width = round(Math.abs(x2 - x1));
      const height = round(Math.abs(y2 - y1));
      const toolBarHeight = showToolbar ? round(Math.abs(y3 - y1)) : 0;
      const minResizeWidth = Math.min(round(Math.abs(x4 - x3)), width);
      const minResizeHeight = Math.min(round(Math.abs(y4 - y3)), height);

      const chartStyle: ChartConfig = {
        left: x1,
        top: y1,
        width: width,
        height: height,
        toolBarHeight,
        toolBarTop: y3,
        toolBarLeft: x3,
        minResizeWidth,
        minResizeHeight,
        tableName,
        showToolbar,
        gridChart: chart,
      };

      newChartStyles.push(chartStyle);
    });

    setChartConfigs(newChartStyles);
  }, [api, charts]);

  const setLayerPosition = useCallback(() => {
    if (!api) return;

    const dataContainer = document.getElementById(canvasId);

    if (!dataContainer || !viewportNode.current || !containerNode.current)
      return;

    const { width, height, top, left } = dataContainer.getBoundingClientRect();
    const gridSizes = api.getGridSizes();
    const { scrollBar, rowNumber, colNumber } = gridSizes;
    const { trackSize } = scrollBar;

    const containerWidth = round(width - rowNumber.width - trackSize);
    const containerHeight = round(height - colNumber.height - trackSize);
    const translateX = round(left + rowNumber.width);
    const translateY = round(top + rowNumber.height);
    const transform = `translate(${getPx(translateX)}, ${getPx(translateY)})`;

    viewportNode.current.style.transform = transform;
    viewportNode.current.style.width = getPx(containerWidth);
    viewportNode.current.style.height = getPx(containerHeight);
    containerNode.current.style.width = getPx(containerWidth);
    containerNode.current.style.height = getPx(containerHeight);
  }, [api]);

  const handleChartResize = useCallback(
    (tableName: string, cols: number, rows: number) => {
      if (!api) return;

      gridCallbacksRef.current.onChartResize?.(tableName, cols, rows);
    },
    [api, gridCallbacksRef]
  );

  const onLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      gridCallbacksRef.current.onGetMoreChartKeys?.(tableName, fieldName);
    },
    [gridCallbacksRef]
  );

  const onSelectKey = useCallback(
    (
      tableName: string,
      fieldName: string,
      value: string | string[],
      isNoDataKey = false
    ) => {
      gridCallbacksRef.current.onSelectChartKey?.(
        tableName,
        fieldName,
        value,
        isNoDataKey
      );
    },
    [gridCallbacksRef]
  );

  const onSelectChart = useCallback(
    (tableName: string) => {
      if (!api) return;

      const table = tableStructure.find((t) => t.tableName === tableName);

      if (!table || table?.isTableNameHeaderHidden) return;

      const { startCol, startRow, endCol } = table;

      api.updateSelection({
        startCol,
        startRow,
        endCol,
        endRow: startRow,
      });
    },
    [api, tableStructure]
  );

  const onChartDblClick = useCallback(() => {
    gridCallbacksRef.current.onChartDblClick?.();
  }, [gridCallbacksRef]);

  const handleContextMenu = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      chartConfig: ChartConfig
    ) => {
      e.preventDefault();
      const mousePosition = getMousePosition(e);

      if (!api || !mousePosition) return;

      api.openContextMenuAtCoords(
        mousePosition.x,
        mousePosition.y,
        chartConfig.gridChart.tableStartCol,
        chartConfig.gridChart.tableStartRow,
        'html-element'
      );
    },
    [api]
  );

  // Allow to scroll spreadsheet when mouse is over charts
  useEffect(() => {
    if (!api) return;

    const container = containerNode.current;

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
  }, [api, containerNode]);

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
      setupCharts();
    });
  }, [zoom, setupCharts, charts, chartData, columnSizes]);

  useEffect(() => {
    if (!api) return;

    const viewportUnsubscribe = api.gridViewportSubscription(setupCharts);

    const startMoveModeSubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode)
      )
      .subscribe(() => {
        setMoveMode(true);
      });

    const stopMoveModeSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveMode))
      .subscribe(() => {
        setMoveMode(false);
      });

    return () => {
      viewportUnsubscribe();
      startMoveModeSubscription.unsubscribe();
      stopMoveModeSubscription.unsubscribe();
    };
  }, [api, setupCharts]);

  return (
    <div
      className="block fixed left-0 top-0 pointer-events-none overflow-hidden bg-transparent z-[103]"
      ref={viewportNode}
    >
      <div className="relative" id="chartsContainer" ref={containerNode}>
        {chartConfigs.map((chartConfig) => (
          <div
            key={chartConfig.tableName}
            onContextMenu={(e) => handleContextMenu(e, chartConfig)}
            onMouseEnter={() => setHoveredChart(chartConfig.tableName)}
            onMouseLeave={() => setHoveredChart(null)}
          >
            {chartConfig.showToolbar && (
              <div>
                <ToolBar
                  chartConfig={chartConfig}
                  isHidden={hiddenCharts.includes(chartConfig.tableName)}
                  moveMode={moveMode}
                  zoom={zoom}
                  onLoadMoreKeys={onLoadMoreKeys}
                  onSelectChart={() => onSelectChart(chartConfig.tableName)}
                  onSelectKey={onSelectKey}
                />
              </div>
            )}

            <div
              className="absolute border-[0.3px] border-strokePrimary bg-bgLayer3"
              key={chartConfig.tableName}
              style={{
                left: getPx(chartConfig.left),
                top: getPx(chartConfig.top),
                width: getPx(chartConfig.width),
                height: getPx(chartConfig.height),
                display: hiddenCharts.includes(chartConfig.tableName)
                  ? 'none'
                  : 'block',
                pointerEvents: moveMode ? 'none' : 'auto',
              }}
            >
              {chartConfig.gridChart.isEmpty ? (
                <EmptyChart
                  gridCallbacksRef={gridCallbacksRef}
                  parsedSheets={parsedSheets}
                  tableName={chartConfig.tableName}
                />
              ) : (
                <Chart
                  chartConfig={chartConfig}
                  chartData={chartData}
                  theme={theme}
                  zoom={zoom}
                  onChartDblClick={onChartDblClick}
                  onSelectChart={() => onSelectChart(chartConfig.tableName)}
                />
              )}
            </div>
            {(hoveredChart === chartConfig.tableName ||
              resizingChart === chartConfig.tableName) && (
              <ResizeHandler
                api={api}
                chartConfig={chartConfig}
                onChartResize={(cols, rows) => {
                  handleChartResize(chartConfig.tableName, cols, rows);
                }}
                onStartResizing={() => setResizingChart(chartConfig.tableName)}
                onStopResizing={() => setResizingChart(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
