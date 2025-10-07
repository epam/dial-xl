import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { CellPlacement } from '@frontend/common';
import { Graphics, useApp } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { GridCell } from '../../types';
import {
  getMousePosition,
  getSymbolWidth,
  isClickInsideCanvas,
} from '../../utils';
import { GridEvent } from '../GridApiWrapper';

const threshold = 5;

export function ColResizer() {
  const {
    columnSizes,
    gridApi,
    gridSizes,
    gridHeight,
    theme,
    getCell,
    gridCallbacks,
    getBitmapFontName,
    isPanModeEnabled,
    setSelectionEdges,
  } = useContext(GridStateContext);
  const { viewportCoords, getCellX, getCellY, getCellFromCoords } =
    useContext(GridViewportContext);
  const app = useApp();

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [resizerX, setResizerX] = useState<number | null>(null);
  const [resizerY, setResizerY] = useState<number | null>(null);
  const [nextCol, setNextCol] = useState<number | null>(null);
  const [deltaX, setDeltaX] = useState(0);
  const [initialCell, setInitialCell] = useState<GridCell | null>(null);
  const [resizeType, setResizeType] = useState<
    'colNumber' | 'tableCell' | null
  >(null);
  const isMouseDown = useRef(false);

  const lastMouseUpTimestamp = useRef(0);
  const isNearColumnBorder = useRef(false);

  const getResizerRelatedCellByPosition = useCallback(
    (x: number, y: number): CellPlacement | undefined => {
      const targetCell = getCellFromCoords(x, y);
      const { col, row } = targetCell;

      const cell = { col, row };
      const cellX = getCellX(col);

      const nextCellX = getCellX(col + 1);

      const resizerTargetCell =
        Math.abs(x - cellX) <= threshold
          ? { col: col - 1, row }
          : Math.abs(x - nextCellX) <= threshold
          ? cell
          : undefined;

      return resizerTargetCell;
    },
    [getCellFromCoords, getCellX]
  );

  const handleMouseMove = useCallback(
    (e: Event) => {
      if (isPanModeEnabled) return;

      const mousePosition = getMousePosition(e as MouseEvent);
      if (!mousePosition) return;

      const { x, y } = mousePosition;
      const { colNumber } = gridSizes;
      const targetCell = getCellFromCoords(x, y);
      const { col, row } = targetCell;

      const isColNumber = y <= colNumber.height && col > 0;

      const resizerTargetCellPlacement = getResizerRelatedCellByPosition(x, y);
      const resizerNextTargetCellX =
        resizerTargetCellPlacement &&
        getCellX(resizerTargetCellPlacement.col + 1);

      if (!isColNumber && !isActive) {
        const resizerTargetCell =
          resizerTargetCellPlacement &&
          getCell(
            resizerTargetCellPlacement.col,
            resizerTargetCellPlacement.row
          );
        const isResizableCell =
          !!resizerTargetCell?.table &&
          !resizerTargetCell.isTableHeader &&
          resizerTargetCell.endCol === resizerTargetCell.col &&
          !resizerTargetCell.table?.isTableHorizontal &&
          !resizerTargetCell.table.chartType;

        if (!isResizableCell) {
          isNearColumnBorder.current = false;
          setIsHovered(false);
          setResizerX(null);
          setResizerY(null);

          return;
        }
      }

      if (isMouseDown.current && !isHovered && !isActive) {
        return;
      }

      if (resizerTargetCellPlacement && resizerNextTargetCellX) {
        e.preventDefault();
        e.stopPropagation();
        isNearColumnBorder.current = true;
        setIsHovered(true);
        if (resizerX === null) {
          setResizerX(resizerNextTargetCellX);
        }
        if (resizerY === null || !isActive) {
          setResizerY(isColNumber ? 0 : getCellY(row));
        }
      } else {
        isNearColumnBorder.current = false;
        setIsHovered(false);

        if (!isActive) {
          setResizerX(null);
          setResizerY(null);
        }
      }

      if (isActive && initialCell) {
        setSelectionEdges(null, { silent: true });

        const cellWidth =
          col - initialCell.col + initialCell.endCol - initialCell.startCol + 1;

        if (cellWidth <= 0) return;

        const cellEndX = getCellX(col + 1);
        const defaultCellEndX = getCellX(initialCell.col + 1);

        setNextCol(col + 1);

        if (resizeType === 'tableCell') {
          setDeltaX(cellEndX - defaultCellEndX);
        }

        if (resizeType === 'colNumber') {
          setDeltaX(x - defaultCellEndX);
        }
      }
    },
    [
      getCell,
      getCellFromCoords,
      getCellX,
      getCellY,
      getResizerRelatedCellByPosition,
      gridSizes,
      initialCell,
      isActive,
      isHovered,
      resizeType,
      resizerX,
      resizerY,
      isPanModeEnabled,
      setSelectionEdges,
    ]
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (isPanModeEnabled) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { x, y } = mousePosition;

      if (!isClickInsideCanvas(x, y, gridSizes, true)) return;

      isMouseDown.current = true;

      if (isNearColumnBorder.current) {
        setSelectionEdges(null, { silent: true });

        setIsActive(true);

        const resizerTargetCell = getResizerRelatedCellByPosition(x, y);

        if (!resizerTargetCell) return;

        const { colNumber } = gridSizes;

        if (resizerTargetCell.row === 0 || y <= colNumber.height) {
          setInitialCell({
            col: resizerTargetCell.col,
            row: resizerTargetCell.row,
          } as GridCell);
          setResizeType('colNumber');
        } else {
          const cell = getCell(resizerTargetCell.col, resizerTargetCell.row);

          if (!cell) return;

          setInitialCell(cell);
          setResizeType('tableCell');
        }

        e.preventDefault();
        e.stopPropagation();
      }
    },
    [
      getCell,
      getResizerRelatedCellByPosition,
      gridSizes,
      isPanModeEnabled,
      setSelectionEdges,
    ]
  );

  const cleanup = useCallback(() => {
    setDeltaX(0);
    setInitialCell(null);
    setResizerX(null);
    setResizerY(null);
    setNextCol(null);
    setResizeType(null);
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;

    if (isActive) {
      setIsActive(false);
      lastMouseUpTimestamp.current = Date.now();

      if (
        initialCell?.table &&
        initialCell?.field &&
        nextCol !== null &&
        resizeType === 'tableCell'
      ) {
        const sizeDelta = nextCol - 1 - initialCell.endCol;

        gridCallbacks.onChangeFieldColumnSize?.(
          initialCell.table.tableName,
          initialCell.field.fieldName,
          sizeDelta
        );
      }

      if (initialCell && resizeType === 'colNumber') {
        const { width, minWidth } = gridSizes.colNumber;
        const columnWidth = columnSizes[initialCell.col] ?? width;

        gridApi.event.emit({
          type: GridEvent.columnResize,
          column: initialCell.col,
          width: Math.max(minWidth, columnWidth + deltaX),
        });
      }
    }

    cleanup();
  }, [
    cleanup,
    columnSizes,
    deltaX,
    gridApi,
    gridCallbacks,
    gridSizes,
    initialCell,
    isActive,
    nextCol,
    resizeType,
  ]);

  const handleDblClick = useCallback(
    (e: Event) => {
      if (isPanModeEnabled) return;

      const currentTimestamp = Date.now();
      const lastTimestamp = lastMouseUpTimestamp.current;
      const timestampDiff = currentTimestamp - lastTimestamp;

      if (timestampDiff < 200) {
        e.preventDefault();
        e.stopPropagation();

        const mousePosition = getMousePosition(e as MouseEvent);
        if (!mousePosition) return;

        const { x, y } = mousePosition;
        const { col, row } = getCellFromCoords(x, y);

        if (row === 0) {
          gridApi.event.emit({
            type: GridEvent.columnResizeDbClick,
            column: col,
          });
          cleanup();

          return;
        }

        const resizerTargetCellPlacement = getResizerRelatedCellByPosition(
          x,
          y
        );
        const resizerTargetCell =
          resizerTargetCellPlacement &&
          getCell(
            resizerTargetCellPlacement.col,
            resizerTargetCellPlacement.row
          );
        const { cellFontFamily, cellFontColorName } = theme.cell;
        const cellY = getCellY(row);

        if (!resizerTargetCell?.table) return;
        const startCellX = getCellX(resizerTargetCell.startCol);

        const startRow =
          resizerTargetCell.table.startRow +
          (resizerTargetCell.table.isTableNameHeaderHidden ? 0 : 1);

        const symbolWidth = getSymbolWidth(
          gridSizes.cell.fontSize,
          getBitmapFontName(cellFontFamily, cellFontColorName)
        );
        let maxWidth = 0;
        for (let i = startRow; i <= resizerTargetCell.table.endRow; i++) {
          const cell = getCell(resizerTargetCell.col, i);

          if (
            cell?.table?.tableName !== resizerTargetCell.table.tableName ||
            cell?.field?.fieldName !== resizerTargetCell.field?.fieldName
          )
            continue;

          const cellWidth =
            (cell.displayValue?.length ?? cell.value?.length ?? 0) *
            symbolWidth;

          if (maxWidth < cellWidth) {
            maxWidth = cellWidth;
          }
        }

        const cellEnd = getCellFromCoords(startCellX + maxWidth, cellY);

        const sizeDelta = cellEnd.col - resizerTargetCell.col;

        if (!resizerTargetCell?.table || !resizerTargetCell?.field) return;

        gridCallbacks.onChangeFieldColumnSize?.(
          resizerTargetCell.table.tableName,
          resizerTargetCell.field.fieldName,
          sizeDelta
        );

        cleanup();
      }
    },
    [
      cleanup,
      getBitmapFontName,
      getCell,
      getCellFromCoords,
      getCellX,
      getCellY,
      getResizerRelatedCellByPosition,
      gridApi.event,
      gridCallbacks,
      gridSizes.cell.fontSize,
      theme.cell,
      isPanModeEnabled,
    ]
  );

  useEffect(() => {
    if (!app) return;

    app.view.addEventListener?.('mousemove', handleMouseMove, true);
    app.view.addEventListener?.('mousedown', handleMouseDown, true);
    app.view.addEventListener?.('mouseup', handleMouseUp, true);
    app.view.addEventListener?.('dblclick', handleDblClick, true);

    return () => {
      app?.view?.removeEventListener?.('mousemove', handleMouseMove, true);
      app?.view?.removeEventListener?.('mousedown', handleMouseDown, true);
      app?.view?.removeEventListener?.('mouseup', handleMouseUp, true);
      app?.view?.removeEventListener?.('dblclick', handleDblClick, true);
    };
  }, [app, handleDblClick, handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const graphics = graphicsRef.current;
    if (!graphics) return;

    graphics.clear();
    app?.start();
    if (!isHovered && !isActive) return;
    if (resizerX === null || resizerY === null) return;

    const { resizerActiveColor, resizerHoverColor } = theme.colNumber;
    const { resizerWidth, height } = gridSizes.cell;
    const color = isActive ? resizerActiveColor : resizerHoverColor;

    graphics.beginFill(color);

    const resizerHeight = height * 0.7;
    const verticalOffset = (height - resizerHeight) / 2;

    graphics.drawRoundedRect(
      resizerX - resizerWidth / 2 + (isActive ? deltaX : 0),
      resizerY + verticalOffset,
      resizerWidth,
      resizerHeight,
      3
    );

    graphics.endFill();

    if (isActive && initialCell?.table && resizeType === 'tableCell') {
      const { startRow, endRow, isTableNameHeaderHidden } = initialCell.table;
      const fieldStartRowY = getCellY(
        startRow + (isTableNameHeaderHidden ? 0 : 1)
      );
      const fieldEndRowY = getCellY(endRow + 1);

      const height = Math.min(
        Math.abs(fieldEndRowY - fieldStartRowY),
        gridHeight
      );

      graphics.lineStyle(1, color);
      graphics.moveTo(resizerX + deltaX, fieldStartRowY);
      graphics.lineTo(resizerX + deltaX, fieldStartRowY + height);
    } else if (isActive && resizeType === 'colNumber') {
      graphics.lineStyle(1, color);
      graphics.moveTo(resizerX + deltaX, resizerY);
      graphics.lineTo(resizerX + deltaX, resizerY + gridHeight);
    }
  }, [
    app,
    deltaX,
    getCellY,
    gridHeight,
    gridSizes,
    initialCell,
    isActive,
    isHovered,
    resizeType,
    resizerX,
    resizerY,
    theme,
    viewportCoords,
  ]);

  return (
    <Graphics
      cursor={isHovered || isActive ? 'col-resize' : 'default'}
      eventMode="static"
      ref={graphicsRef}
      zIndex={ComponentLayer.Resizer}
    />
  );
}
