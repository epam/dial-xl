import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { canvasId } from '../../constants';
import { getPx, round } from '../../utils';
import { LineChart } from './lineChart';
import { ResizeHandler } from './resizeHandler';
import { ToolBar } from './toolBar';
import { ChartConfig, Props } from './types';
import { useHideCharts } from './useHideCharts';

const toolbarRows = 2;

// TODO:
// 1. Subscribe to start/stop move mode events (setMoveMode(true/false))
// 2. Subscribe to resize column event
export function Charts({
  gridCallbacksRef,
  api,
  chartData = {},
  charts = [],
  zoom = 1,
  theme,
  columnSizes,
}: Props) {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [moveMode, setMoveMode] = useState(false);
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

      const x1 = api.getCellX(startCol) - xOffset;
      const y1 = api.getCellY(startRow + toolbarRows) - yOffset;

      const x2 = api.getCellX(endCol) - xOffset;
      const y2 = api.getCellY(endRow + toolbarRows) - yOffset;

      const x3 = api.getCellX(startCol) - xOffset;
      const y3 = api.getCellY(startRow) - yOffset;

      const x4 = api.getCellX(startCol + minCols) - xOffset;
      const y4 = api.getCellY(startRow + minRows) - yOffset;

      const width = round(Math.abs(x2 - x1));
      const height = round(Math.abs(y2 - y1));
      const toolBarHeight = round(Math.abs(y3 - y1));
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
    (tableName: string, x: number, y: number) => {
      if (!api) return;

      const gridSizes = api.getGridSizes();
      const { rowNumber, colNumber } = gridSizes;
      const gridX = x + rowNumber.width;
      const gridY = y + colNumber.height;

      const cellPlacement = api.getCellFromCoords(gridX, gridY);
      const chart = charts.find((c) => c.tableName === tableName);

      if (!cellPlacement || !chart) return;

      const { col, row } = cellPlacement;

      const cols = col - chart.startCol + 1;
      const rows = row - chart.startRow - 1;

      gridCallbacksRef.current.onChartResize?.(tableName, cols, rows);
    },
    [api, charts, gridCallbacksRef]
  );

  const onLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      gridCallbacksRef.current.onGetMoreChartKeys?.(tableName, fieldName);
    },
    [gridCallbacksRef]
  );

  const onSelectKey = useCallback(
    (tableName: string, fieldName: string, value: string) => {
      gridCallbacksRef.current.onSelectChartKey?.(tableName, fieldName, value);
    },
    [gridCallbacksRef]
  );

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

    const unsubscribe = api.gridViewportSubscription(setupCharts);

    return () => {
      unsubscribe();
    };
  }, [api, setupCharts]);

  return (
    <div
      className="block fixed left-0 top-0 pointer-events-none overflow-hidden bg-transparent z-[103]"
      ref={viewportNode}
    >
      <div className="relative" id="chartsContainer" ref={containerNode}>
        {chartConfigs.map((chartConfig) => (
          <Fragment key={chartConfig.tableName}>
            <ToolBar
              chartConfig={chartConfig}
              isHidden={hiddenCharts.includes(chartConfig.tableName)}
              moveMode={moveMode}
              zoom={zoom}
              onLoadMoreKeys={onLoadMoreKeys}
              onSelectKey={onSelectKey}
            />

            <div
              className="absolute border-[0.3px] border-strokeGridMain border-opacity-50 bg-bgGridField"
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
              <LineChart
                chartConfig={chartConfig}
                chartData={chartData}
                theme={theme}
                zoom={zoom}
              />
            </div>
            <ResizeHandler
              chartConfig={chartConfig}
              onChartResize={(x, y) => {
                handleChartResize(chartConfig.tableName, x, y);
              }}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
