import * as PIXI from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Graphics, useApp } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';
import { GridCell } from '../../types';
import { getMousePosition } from '../../utils';
import { GridEvent } from '../GridApiWrapper';

type BorderState = {
  visible: boolean;
  tableName: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  cell?: GridCell;
};

export const TableMoveHandle = () => {
  const app = useApp();

  const { getCell, gridSizes, gridApi } = useContext(GridStateContext);
  const { getCellFromCoords, getCellX, getCellY, viewportEdges } =
    useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const [state, setState] = useState<BorderState>({
    visible: false,
    tableName: null,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const borderThickness = useMemo(
    () => gridSizes.cell.tableMoveBorderWidth,
    [gridSizes]
  );

  // Find a table near a pointer
  const findTableNearPointer = useCallback(
    (
      clientX: number,
      clientY: number
    ): { cell: GridCell; col: number; row: number } | null => {
      const offsets = [
        { dx: 0, dy: 0 },
        { dx: 0, dy: borderThickness },
        { dx: 0, dy: -borderThickness },
        { dx: borderThickness, dy: 0 },
        { dx: -borderThickness, dy: 0 },
      ];

      for (const { dx, dy } of offsets) {
        const { col, row } = getCellFromCoords(clientX + dx, clientY + dy);
        const cell = getCell(col, row) as GridCell | undefined;

        if (cell?.table?.tableName) {
          return { cell, col, row };
        }
      }

      return null;
    },
    [getCell, getCellFromCoords, borderThickness]
  );

  const handleMouseMove = useCallback(
    (e: Event) => {
      const mousePosition = getMousePosition(e as MouseEvent);
      if (!mousePosition) return;

      const { x: clientX, y: clientY } = mousePosition;

      const result = findTableNearPointer(clientX, clientY);

      if (!result) {
        setState((prev) =>
          prev.visible
            ? {
                ...prev,
                visible: false,
                tableName: null,
                cell: undefined,
              }
            : prev
        );

        return;
      }

      const { cell, col, row } = result;
      const table = cell.table!;
      const tableName = table.tableName;

      let topRow = row;
      let bottomRow = row;

      for (let r = row - 1; r >= 0; r--) {
        const above = getCell(col, r);
        if (!above?.table || above.table.tableName !== tableName) break;
        topRow = r;
      }

      for (let r = row + 1; ; r++) {
        const below = getCell(col, r);
        if (!below?.table || below.table.tableName !== tableName) break;
        bottomRow = r;
      }

      const tableTopY = getCellY(topRow);
      const tableBottomY = getCellY(bottomRow + 1);
      const tableHeight = tableBottomY - tableTopY;

      const { startCol, endCol } = viewportEdges.current;

      let leftVisibleCol: number | null = null;
      let rightVisibleCol: number | null = null;

      for (let c = startCol; c <= endCol; c++) {
        const topCell = getCell(c, topRow);
        if (topCell?.table?.tableName === tableName) {
          if (leftVisibleCol === null) leftVisibleCol = c;
          rightVisibleCol = c;
        }
      }

      if (leftVisibleCol === null || rightVisibleCol === null) {
        setState((prev) =>
          prev.visible
            ? {
                ...prev,
                visible: false,
                tableName: null,
                cell: undefined,
              }
            : prev
        );

        return;
      }

      const leftX = getCellX(leftVisibleCol);
      const rightX = getCellX(rightVisibleCol + 1);
      const width = rightX - leftX;

      setState({
        visible: true,
        tableName,
        x: leftX,
        y: tableTopY,
        width,
        height: tableHeight,
        cell,
      });
    },
    [findTableNearPointer, getCell, getCellX, getCellY, viewportEdges]
  );

  useEffect(() => {
    if (!app) return;

    app.view.addEventListener?.('mousemove', handleMouseMove, true);

    return () => {
      app?.view?.removeEventListener?.('mousemove', handleMouseMove, true);
    };
  }, [app, handleMouseMove]);

  const handlePointerDown = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (!state.tableName || !gridApi) return;

      const mousePosition = getMousePosition(e);
      if (!mousePosition) return;

      // Prevent selecting one cell while start moving the table
      const ne = e.nativeEvent as PointerEvent | MouseEvent | undefined;
      ne?.stopPropagation();

      const { x, y } = mousePosition;
      gridApi.event.emit({
        type: GridEvent.moveChartOrTable,
        cell: state.cell,
        x,
        y,
      });
    },
    [gridApi, state.cell, state.tableName]
  );

  const draw = useCallback(() => {
    const graphics = graphicsRef.current;
    if (!graphics) return;

    graphics.clear();

    if (!state.visible) return;

    const { x, y, width, height, cell } = state;
    const t = borderThickness;

    graphics.beginFill(0x000000, 0.01);

    // top border
    graphics.drawRect(x, y - t / 2, width, t);
    // bottom border
    graphics.drawRect(x, y + height - t / 2, width, t);
    // left border
    graphics.drawRect(x - t / 2, y, t, height);

    if (cell?.table?.chartType) {
      // right border (only for charts)
      graphics.drawRect(x + width - t / 2, y, t, height);
    }

    graphics.endFill();
  }, [state, borderThickness]);

  useDraw(draw);

  return (
    <Graphics
      cursor={state.visible ? 'grab' : 'default'}
      eventMode={state.visible ? 'static' : 'auto'}
      pointerdown={handlePointerDown}
      ref={graphicsRef}
      zIndex={ComponentLayer.TableMoveHandle}
    />
  );
};
