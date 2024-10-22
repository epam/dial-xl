import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { Container, Graphics, useApp, useTick } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { getMousePosition, getSymbolWidth } from '../../utils';

interface Props {
  col: number;
  row: number;
}

export function CellResizer({ col, row }: Props) {
  const { gridSizes, theme, getCell, gridCallbacks, getBitmapFontName } =
    useContext(GridStateContext);
  const { viewportCoords, getCellX, getCellY, getCellFromCoords } =
    useContext(GridViewportContext);
  const app = useApp();

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const isHovered = useRef(false);
  const isActive = useRef(false);
  const deltaX = useRef<number>(0);
  const fieldSizeDelta = useRef(col);
  const lastMouseUpTimestamp = useRef<number>(0);

  const initialCellSize = useMemo(() => {
    const cell = getCell(col, row);

    if (!cell) return 1;

    return cell.endCol - cell.startCol + 1;
  }, [col, getCell, row]);

  const handleMouseOver = useCallback(() => {
    if (!isActive.current) {
      isHovered.current = true;
    }
  }, []);

  const handleMouseOut = useCallback(() => {
    isHovered.current = false;
  }, []);

  // Stop selection event if start resize
  const handleDocumentMouseDown = useCallback((e: Event) => {
    if (isActive.current) {
      e.stopPropagation();
    }
  }, []);

  const handleMouseDown = useCallback((e: PIXI.FederatedPointerEvent) => {
    isActive.current = true;
  }, []);

  const handleDblClick = useCallback(
    (e: Event) => {
      if (Date.now() - lastMouseUpTimestamp.current < 100) {
        e.preventDefault();
        e.stopPropagation();

        const { cellFontFamily, cellFontColorName } = theme.cell;
        const cell = getCell(col, row);
        const cellY = getCellY(row);

        if (!cell?.table) return;
        const startCellX = getCellX(cell.startCol);

        const startRow =
          cell.table.startRow + (cell.table.isTableNameHeaderHidden ? 0 : 1);

        const symbolWidth = getSymbolWidth(
          gridSizes.cell.fontSize,
          getBitmapFontName(cellFontFamily, cellFontColorName)
        );
        let maxWidth = 0;
        for (let i = startRow; i < cell.table.endRow; i++) {
          const cellWidth = (cell.value?.length ?? 0) * symbolWidth;

          if (maxWidth < cellWidth) {
            maxWidth = cellWidth;
          }
        }

        const cellEnd = getCellFromCoords(startCellX + maxWidth, cellY);

        const sizeDelta = cellEnd.col - col;

        if (!cell?.table || !cell?.field) return;

        gridCallbacks.onChangeFieldColumnSize?.(
          cell.table.tableName,
          cell.field.fieldName,
          sizeDelta
        );
      }
    },
    [
      col,
      getBitmapFontName,
      getCell,
      getCellFromCoords,
      getCellX,
      getCellY,
      gridCallbacks,
      gridSizes.cell.fontSize,
      row,
      theme.cell,
    ]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isActive.current) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      e.preventDefault();
      e.stopPropagation();
      const { x, y } = mousePosition;
      const actualCell = getCellFromCoords(x, y);
      const newEndCol = actualCell.col;

      if (newEndCol - col + initialCellSize <= 0) return;

      const cellEndX = getCellX(newEndCol + 1);
      const defaultCellEndX = getCellX(col + 1);

      deltaX.current = cellEndX - defaultCellEndX;
      fieldSizeDelta.current = newEndCol - col;
    },
    [col, getCellFromCoords, getCellX, initialCellSize]
  );

  const handleMouseUp = useCallback(() => {
    if (isActive.current) {
      isActive.current = false;
      lastMouseUpTimestamp.current = Date.now();

      if (deltaX.current) {
        const cell = getCell(col, row);

        if (!cell?.table || !cell?.field) return;

        gridCallbacks.onChangeFieldColumnSize?.(
          cell.table.tableName,
          cell.field.fieldName,
          fieldSizeDelta.current
        );
      }
    }

    deltaX.current = 0;
  }, [col, getCell, gridCallbacks, row]);

  useEffect(() => {
    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    app.view.addEventListener?.('dblclick', handleDblClick, true);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      app?.view?.removeEventListener?.('dblclick', handleDblClick, true);
    };
  }, [
    app.view,
    handleDblClick,
    handleDocumentMouseDown,
    handleMouseMove,
    handleMouseUp,
  ]);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    const x = getCellX(col + 1);
    const y = getCellY(row);
    const cellData = getCell(col, row);

    if (!cellData?.table) return;

    const { startRow, endRow, isTableNameHeaderHidden } = cellData.table;
    const fieldStartRowY = getCellY(
      startRow + (isTableNameHeaderHidden ? 0 : 1)
    );
    const fieldEndRowY = getCellY(endRow + 1);

    const { resizerActiveColor, resizerHoverColor, borderColor } =
      theme.colNumber;
    const { cell } = gridSizes;
    const color = isActive.current
      ? resizerActiveColor
      : isHovered.current
      ? resizerHoverColor
      : borderColor;

    const height =
      Math.min(fieldEndRowY, viewportCoords.current.y2) -
      Math.max(fieldStartRowY, viewportCoords.current.y1);

    if (isActive.current) {
      graphics.beginFill(resizerActiveColor);
    } else if (isHovered.current) {
      graphics.beginFill(resizerHoverColor);
    } else {
      // We need mostly transparent element to have been able to track events on it
      graphics.beginFill(0, 0.01);
    }

    graphics
      .drawRoundedRect(
        x - cell.resizerWidth / 2 + deltaX.current,
        y,
        cell.resizerWidth,
        cell.height,
        3
      )
      .endFill();

    if (isActive.current) {
      graphics
        .lineStyle({
          width: 1,
          color,
          alignment: 0,
        })
        .moveTo(x + deltaX.current, fieldStartRowY)
        .lineTo(x + deltaX.current, fieldStartRowY + height);
    }
  }, [
    getCellX,
    col,
    getCellY,
    row,
    getCell,
    theme.colNumber,
    gridSizes,
    viewportCoords,
  ]);

  useTick(draw, true);

  return (
    <Container zIndex={ComponentLayer.Resizer}>
      <Graphics
        cursor="col-resize"
        eventMode="static"
        onmousedown={handleMouseDown}
        onmouseout={handleMouseOut}
        onmouseover={handleMouseOver}
        ref={graphicsRef}
      />
    </Container>
  );
}
