import * as PIXI from 'pixi.js';
import { useCallback, useContext } from 'react';

import { Container, Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils } from '../../hooks';
import { useErrors } from './useErrors';
import { CellError } from './utils';

export function Errors() {
  const { theme, gridSizes, gridApi } = useContext(GridStateContext);
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

  const draw = useCallback(
    (graphics: PIXI.Graphics, cell: CellError) => {
      const { borderColor } = theme.error;
      const { width: lineWidth, circleRadius } = gridSizes.error;

      graphics.clear();

      const { x, y, height, width } = calculateCellDimensions(cell);
      const { isHorizontalFieldError } = cell;
      const circleX = isHorizontalFieldError ? x : x + width;

      graphics
        .lineStyle(lineWidth, borderColor)
        .drawRect(x, y, width, height)
        .endFill();

      graphics
        .lineStyle(lineWidth, borderColor)
        .beginFill(borderColor)
        .drawCircle(circleX, y, circleRadius)
        .endFill();
    },
    [theme, gridSizes, calculateCellDimensions]
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
