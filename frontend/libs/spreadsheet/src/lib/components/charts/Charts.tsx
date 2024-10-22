import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { getDataScroller } from '@frontend/common';

import { chartsContainerId, gridDataContainerClass } from '../../constants';
import {
  EventTypeColumnResize,
  EventTypeColumnResizeDbClick,
  filterByTypeAndCast,
  GridEvent,
  GridSelectionEventStartMoveMode,
  GridSelectionEventStopMoveMode,
  GridSelectionEventType,
} from '../../grid';
import { getPx, round } from '../../utils';
import { LineChart } from './lineChart';
import { ResizeHandler } from './resizeHandler';
import { ToolBar } from './toolBar';
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

    charts.forEach((chart) => {
      const { startCol, startRow, endRow, endCol, tableName } = chart;

      const dataScroller = getDataScroller();
      const { scrollLeft, scrollTop } = dataScroller;

      const { x: x1, y: y1 } = api.getCellPosition(
        startCol,
        startRow + toolbarRows
      );
      const { x: x2, y: y2 } = api.getCellPosition(
        endCol,
        endRow + toolbarRows
      );
      const { x: x3, y: y3 } = api.getCellPosition(startCol, startRow);
      const { x: x4, y: y4 } = api.getCellPosition(
        startCol + minCols,
        startRow + minRows
      );

      const width = round(Math.abs(x2 - x1));
      const height = round(Math.abs(y2 - y1));
      const toolBarHeight = round(Math.abs(y3 - y1));
      const minResizeWidth = Math.min(round(Math.abs(x4 - x3)), width);
      const minResizeHeight = Math.min(round(Math.abs(y4 - y3)), height);

      const chartStyle: ChartConfig = {
        left: x1 + scrollLeft,
        top: y1 + scrollTop,
        width: width,
        height: height,
        toolBarHeight,
        toolBarTop: y3 + scrollTop,
        toolBarLeft: x3 + scrollLeft,
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

    const dataScroller = getDataScroller();
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

    if (
      !dataScroller ||
      !dataContainer ||
      !viewportNode.current ||
      !containerNode.current
    )
      return;

    const dataScrollerRect = dataScroller.getBoundingClientRect();
    const dataContainerRect = dataScroller.getBoundingClientRect();
    const scrollBarSize = 17;

    viewportNode.current.style.transform = `translate(${getPx(
      round(dataScrollerRect.left)
    )}, ${getPx(round(dataScrollerRect.top))})`;
    viewportNode.current.style.width = getPx(
      round(dataScrollerRect.width - scrollBarSize)
    );
    viewportNode.current.style.height = getPx(
      round(dataScrollerRect.height - scrollBarSize)
    );

    containerNode.current.style.width = getPx(round(dataContainerRect.width));
    containerNode.current.style.height = getPx(round(dataContainerRect.height));
  }, [api]);

  const handleChartResize = useCallback(
    (tableName: string, x: number, y: number) => {
      const cell = api?.getCellByCoords(x, y);
      const chart = charts.find((c) => c.tableName === tableName);

      if (!cell || !chart) return;

      const { col, row } = cell;

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
    const startMoveModeSubscription = api?.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventStartMoveMode>(
          GridSelectionEventType.StartMoveMode
        )
      )
      .subscribe(() => {
        setMoveMode(true);
      });

    const stopMoveModeSubscription = api?.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventStopMoveMode>(
          GridSelectionEventType.StopMoveMode
        )
      )
      .subscribe(() => {
        setMoveMode(false);
      });

    const columnResizeSubscription = api?.events$
      .pipe(
        filterByTypeAndCast<EventTypeColumnResize>(GridEvent.columnResize) ||
          filterByTypeAndCast<EventTypeColumnResizeDbClick>(
            GridEvent.columnResizeDbClick
          )
      )
      .subscribe(() => {
        // setTimeout to wait updating column width on double click
        setTimeout(() => {
          setupCharts();
        }, 0);
      });

    return () => {
      [
        startMoveModeSubscription,
        stopMoveModeSubscription,
        columnResizeSubscription,
      ].forEach((s) => s?.unsubscribe());
    };
  }, [api, setupCharts]);

  useEffect(() => {
    setLayerPosition();
  }, [setLayerPosition]);

  useEffect(() => {
    const dataScroller = getDataScroller();
    if (!dataScroller) return;

    const observer = new ResizeObserver(setLayerPosition);
    observer.observe(dataScroller);

    return () => {
      observer.disconnect();
    };
  }, [setLayerPosition]);

  useEffect(() => {
    // setTimeout to wait updating zoom in the dataView
    setTimeout(() => {
      setupCharts();
    });
  }, [zoom, setupCharts, charts, chartData]);

  return (
    <div
      className="block fixed left-0 top-0 pointer-events-none overflow-hidden bg-transparent z-[103]"
      ref={viewportNode}
    >
      <div className="relative" id={chartsContainerId} ref={containerNode}>
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
