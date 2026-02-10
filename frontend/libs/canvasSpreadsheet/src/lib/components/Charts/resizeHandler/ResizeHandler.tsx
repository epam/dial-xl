import cx from 'classnames';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { KeyboardCode } from '@frontend/common';

import { GridApi } from '../../../types';
import { getMousePosition, getPx } from '../../../utils';
import { ChartConfig } from '../types';

type Props = {
  visible: boolean;
  chartConfig: ChartConfig;
  isSelected: boolean;
  apiRef: RefObject<GridApi | null>;
  onChartResize: (x: number, y: number) => void;
  onStartResizing: () => void;
  onStopResizing: () => void;
};

export function ResizeHandler({
  visible,
  isSelected,
  chartConfig,
  apiRef,
  onStartResizing,
  onStopResizing,
  onChartResize,
}: Props) {
  const isResizing = useRef(false);
  const handlerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(chartConfig.width);
  const [height, setHeight] = useState(
    chartConfig.height + chartConfig.toolBarHeight + chartConfig.titleHeight,
  );

  useEffect(() => {
    if (isResizing.current) return;

    setWidth(chartConfig.width);
    setHeight(
      chartConfig.height + chartConfig.toolBarHeight + chartConfig.titleHeight,
    );
  }, [chartConfig]);

  useEffect(() => {
    let updatedColsCount = 0;
    let updatedRowsCount = 0;

    function onMove(e: MouseEvent) {
      const api = apiRef.current;
      if (!isResizing.current || !api) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { col, row } = api.getCellFromCoords(
        mousePosition.x,
        mousePosition.y,
      );
      const cellCoordX = api.getCellX(col + 1);
      const cellCoordY = api.getCellY(row + 1);
      const chartStartCellX = api.getCellX(chartConfig.gridChart.startCol);
      const chartStartCellY = api.getCellY(chartConfig.gridChart.startRow);
      const updateWidth = cellCoordX - chartStartCellX;
      const updateHeight = cellCoordY - chartStartCellY;

      if (updateWidth >= chartConfig.minResizeWidth) {
        updatedColsCount = col + 1 - chartConfig.gridChart.startCol;
        setWidth(updateWidth);
      }

      if (updateHeight >= chartConfig.minResizeHeight) {
        updatedRowsCount = row + 1 - chartConfig.gridChart.startRow;
        setHeight(updateHeight);
      }
    }

    function onStopResize() {
      if (!isResizing.current) return;

      onChartResize(updatedColsCount, updatedRowsCount);
      cleanup();
    }

    function onResizeCancel(e: KeyboardEvent) {
      if (e.key === KeyboardCode.Escape && isResizing.current) {
        cleanup();
      }
    }

    function onStartResize(e: MouseEvent) {
      if ((e.target as HTMLDivElement) !== handlerRef.current) return;

      isResizing.current = true;
      onStartResizing();

      document.body.style.userSelect = 'none';
      document.body.addEventListener('mouseup', onStopResize, true);
      document.body.addEventListener('mousemove', onMove);
      document.body.addEventListener('keydown', onResizeCancel);
    }

    function cleanup() {
      document.body.style.userSelect = 'auto';
      document.body.removeEventListener('mouseup', onStopResize, true);
      document.body.removeEventListener('mousemove', onMove, true);
      document.body.removeEventListener('keydown', onResizeCancel);

      isResizing.current = false;
      onStopResizing();
      setWidth(chartConfig.width);
      setHeight(
        chartConfig.height +
          chartConfig.toolBarHeight +
          chartConfig.titleHeight,
      );
    }

    document.body.addEventListener('mousedown', onStartResize, true);

    return () => {
      document.body.removeEventListener('mousedown', onStartResize, true);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef, chartConfig]);

  const topPosition = useMemo(
    () =>
      chartConfig.showTitle ? chartConfig.titleTop : chartConfig.toolBarTop,
    [chartConfig],
  );
  const leftPosition = useMemo(
    () =>
      chartConfig.showTitle ? chartConfig.titleLeft : chartConfig.toolBarLeft,
    [chartConfig],
  );

  return (
    <>
      {isResizing.current && (
        <div
          className="absolute border-2 border-dashed border-stroke-grid-accent-primary"
          style={{
            width: getPx(width),
            height: getPx(height),
            top: getPx(topPosition),
            left: getPx(leftPosition),
            zIndex: isSelected ? 200 : 50,
          }}
        />
      )}
      <div
        className={cx(
          'w-2 h-2 absolute box-border rounder-[3px] bg-stroke-grid-accent-primary cursor-nwse-resize pointer-events-auto transition-opacity duration-200 ease-in-out',
          isResizing.current || visible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        ref={handlerRef}
        style={{
          top: getPx(topPosition + height - 6),
          left: getPx(leftPosition + width - 6),
          zIndex: isSelected ? 200 : 50,
        }}
      />
    </>
  );
}
