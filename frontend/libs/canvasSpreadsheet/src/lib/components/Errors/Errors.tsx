import * as PIXI from 'pixi.js';
import { useCallback, useContext } from 'react';

import { Container, Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils } from '../../hooks';
import { Color } from '../../types';
import { useErrors } from './useErrors';
import { CellError } from './utils';

export function Errors() {
  const { theme, gridSizes, gridApi, getCell } = useContext(GridStateContext);
  const { getCellY, getCellX } = useContext(GridViewportContext);
  const { calculateCellDimensions } = useCellUtils();
  const { errors } = useErrors();

  const onMouseOver = useCallback(
    (cell: CellError) => {
      const { isHorizontalFieldError, startCol, endCol, startRow, message } =
        cell;
      const x1 = getCellX(startCol);
      const x2 = getCellX(endCol + 1);
      const y1 = getCellY(startRow);
      const width = Math.abs(x2 - x1);
      const tooltipX = isHorizontalFieldError ? x1 : x1 + width;

      gridApi.openTooltip(
        tooltipX,
        y1 - gridSizes.error.tooltipMargin,
        message
      );
    },
    [getCellX, getCellY, gridApi, gridSizes]
  );

  const drawLeftErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: PIXI.Graphics,
      lineWidth: number,
      borderColor: Color
    ) => {
      const col = errorRect.startCol;
      for (let row = errorRect.startRow; row <= errorRect.endRow; row++) {
        const cell = getCell(col, row);

        if (!cell) continue;

        const { x, y, height } = calculateCellDimensions({
          startCol: cell.col,
          startRow: cell.row,
          endCol: cell.col,
          endRow: cell.row,
        });

        if (cell?.table?.tableName === errorRect.tableName) {
          graphics
            .lineStyle(lineWidth, borderColor)
            .moveTo(x, y)
            .lineTo(x, y + height)
            .endFill();
        }
      }
    },
    [calculateCellDimensions, getCell]
  );
  const drawRightErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: PIXI.Graphics,
      lineWidth: number,
      borderColor: Color
    ) => {
      const col = errorRect.endCol;
      for (let row = errorRect.startRow; row <= errorRect.endRow; row++) {
        const cell = getCell(col, row);

        if (!cell) continue;

        const { x, y, height, width } = calculateCellDimensions({
          startCol: cell.col,
          startRow: cell.row,
          endCol: cell.col,
          endRow: cell.row,
        });

        if (cell?.table?.tableName === errorRect.tableName) {
          graphics
            .lineStyle(lineWidth, borderColor)
            .moveTo(x + width, y)
            .lineTo(x + width, y + height)
            .endFill();
        }
      }
    },
    [calculateCellDimensions, getCell]
  );

  const drawTopErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: PIXI.Graphics,
      lineWidth: number,
      borderColor: Color
    ) => {
      const row = errorRect.startRow;
      for (let col = errorRect.startCol; col <= errorRect.endCol; col++) {
        const cell = getCell(col, row);

        if (!cell) continue;

        const { x, y, width } = calculateCellDimensions({
          startCol: cell.col,
          startRow: cell.row,
          endCol: cell.col,
          endRow: cell.row,
        });

        if (cell?.table?.tableName === errorRect.tableName) {
          graphics
            .lineStyle(lineWidth, borderColor)
            .moveTo(x, y)
            .lineTo(x + width, y)
            .endFill();
        }
      }
    },
    [calculateCellDimensions, getCell]
  );

  const drawBottomErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: PIXI.Graphics,
      lineWidth: number,
      borderColor: Color
    ) => {
      const row = errorRect.endRow;
      for (let col = errorRect.startCol; col <= errorRect.endCol; col++) {
        const cell = getCell(col, row);

        if (!cell) continue;

        const { x, y, height, width } = calculateCellDimensions({
          startCol: cell.col,
          startRow: cell.row,
          endCol: cell.col,
          endRow: cell.row,
        });

        if (cell?.table?.tableName === errorRect.tableName) {
          graphics
            .lineStyle(lineWidth, borderColor)
            .moveTo(x, y + height)
            .lineTo(x + width, y + height)
            .endFill();
        }
      }
    },
    [calculateCellDimensions, getCell]
  );

  const drawErrorsBorders = useCallback(
    (graphics: PIXI.Graphics, errorRect: CellError) => {
      const { borderColor } = theme.error;
      const { width: lineWidth } = gridSizes.error;

      // Left border for errors rect
      drawLeftErrorBorder(errorRect, graphics, lineWidth, borderColor);
      drawRightErrorBorder(errorRect, graphics, lineWidth, borderColor);
      drawTopErrorBorder(errorRect, graphics, lineWidth, borderColor);
      drawBottomErrorBorder(errorRect, graphics, lineWidth, borderColor);
    },
    [
      drawBottomErrorBorder,
      drawLeftErrorBorder,
      drawRightErrorBorder,
      drawTopErrorBorder,
      gridSizes.error,
      theme.error,
    ]
  );

  const draw = useCallback(
    (graphics: PIXI.Graphics, cell: CellError) => {
      const { borderColor } = theme.error;
      const { width: lineWidth, circleRadius } = gridSizes.error;

      graphics.clear();

      const { x, y, width } = calculateCellDimensions(cell);
      const { isHorizontalFieldError } = cell;
      const cellData = getCell(cell.endCol, cell.startRow);
      const isShowErrorCircle = cellData?.table?.tableName === cell.tableName;

      drawErrorsBorders(graphics, cell);

      if (isShowErrorCircle) {
        const circleX = isHorizontalFieldError ? x : x + width;
        graphics
          .lineStyle(lineWidth, borderColor)
          .beginFill(borderColor)
          .drawCircle(circleX, y, circleRadius)
          .endFill();
      }
    },
    [
      theme.error,
      gridSizes.error,
      calculateCellDimensions,
      getCell,
      drawErrorsBorders,
    ]
  );

  return (
    <Container zIndex={ComponentLayer.Error}>
      {errors.map((cell) => (
        <Graphics
          cursor="pointer"
          draw={(g: PIXI.Graphics) => draw(g, cell)}
          eventMode="static"
          key={cell.key}
          onmouseout={() => gridApi.closeTooltip()}
          onmouseover={() => onMouseOver(cell)}
        />
      ))}
    </Container>
  );
}
