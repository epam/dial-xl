import { Graphics } from 'pixi.js';
import { useCallback, useContext, useRef } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { Color } from '../../types';
import { useErrors } from './useErrors';
import { CellError } from './utils';

type Props = {
  zIndex: number;
};

export function Errors({ zIndex }: Props) {
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
        message,
      );
    },
    [getCellX, getCellY, gridApi, gridSizes],
  );

  const drawLeftErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: Graphics,
      lineWidth: number,
      borderColor: Color,
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
            .moveTo(x, y)
            .lineTo(x, y + height)
            .stroke({ width: lineWidth, color: borderColor });
        }
      }
    },
    [calculateCellDimensions, getCell],
  );
  const drawRightErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: Graphics,
      lineWidth: number,
      borderColor: Color,
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
            .moveTo(x + width, y)
            .lineTo(x + width, y + height)
            .stroke({ width: lineWidth, color: borderColor });
        }
      }
    },
    [calculateCellDimensions, getCell],
  );

  const drawTopErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: Graphics,
      lineWidth: number,
      borderColor: Color,
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
            .moveTo(x, y)
            .lineTo(x + width, y)
            .stroke({ width: lineWidth, color: borderColor });
        }
      }
    },
    [calculateCellDimensions, getCell],
  );

  const drawBottomErrorBorder = useCallback(
    (
      errorRect: CellError,
      graphics: Graphics,
      lineWidth: number,
      borderColor: Color,
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
            .moveTo(x, y + height)
            .lineTo(x + width, y + height)
            .stroke({ width: lineWidth, color: borderColor });
        }
      }
    },
    [calculateCellDimensions, getCell],
  );

  const drawErrorsBorders = useCallback(
    (graphics: Graphics, errorRect: CellError) => {
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
    ],
  );

  const graphicsRefs = useRef<Map<string, Graphics>>(new Map());

  const draw = useCallback(() => {
    errors.forEach((cell) => {
      const graphics = graphicsRefs.current.get(cell.key);
      if (!graphics) return;

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
          .circle(circleX, y, circleRadius)
          .fill({ color: borderColor })
          .stroke({ width: lineWidth, color: borderColor });
      }
    });
  }, [
    errors,
    theme.error,
    gridSizes.error,
    calculateCellDimensions,
    getCell,
    drawErrorsBorders,
  ]);

  useDraw(draw);

  return (
    <pixiContainer label="Errors" zIndex={zIndex}>
      {errors.map((cell) => (
        <pixiGraphics
          cursor="pointer"
          draw={() => {}}
          eventMode="static"
          key={cell.key}
          label={`ErrorGraphics_${cell.key}`}
          ref={(ref: Graphics | null) => {
            if (ref) {
              graphicsRefs.current.set(cell.key, ref);
            } else {
              graphicsRefs.current.delete(cell.key);
            }
          }}
          onMouseOut={() => gridApi.closeTooltip()}
          onMouseOver={() => onMouseOver(cell)}
        />
      ))}
    </pixiContainer>
  );
}
