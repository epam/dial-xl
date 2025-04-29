import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { naExpression } from '@frontend/parser';
import { Container, Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { Edges } from '../../types';

export function Overrides() {
  const { theme, gridSizes, getCell } = useContext(GridStateContext);
  const { viewportEdges, viewportRowCount, viewportColCount } =
    useContext(GridViewportContext);
  const { calculateCellDimensions } = useCellUtils();

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const [overrideCells, setOverrideCells] = useState<Edges[]>([]);

  useEffect(() => {
    if (!viewportEdges.current || !viewportRowCount || !viewportColCount)
      return;

    const { startRow, endRow, startCol, endCol } = viewportEdges.current;
    const updatedOverrideCells: Edges[] = [];
    const cellKeys = new Set<string>();

    for (let row = startRow; row <= endRow; ++row) {
      for (let col = startCol; col <= endCol; ++col) {
        const cell = getCell(col, row);

        if (!cell) continue;

        // TODO: add to the GridCell new property like shouldDrawOverride
        const isCellError = cell.hasError && cell.errorMessage;
        const isOverride =
          cell.isOverride &&
          cell.field?.expression &&
          cell.field.expression !== naExpression;

        if (!isOverride || isCellError) continue;

        const cellKey = `${cell.startCol}_${cell.endCol}_${cell.row}`;

        if (cellKeys.has(cellKey)) continue;

        cellKeys.add(cellKey);
        updatedOverrideCells.push({
          startCol: cell.startCol,
          endCol: cell.endCol,
          startRow: cell.row,
          endRow: cell.row,
        });
      }
    }

    setOverrideCells(updatedOverrideCells);
  }, [getCell, viewportEdges, viewportRowCount, viewportColCount]);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    const { borderColor } = theme.override;
    const { width: lineWidth } = gridSizes.override;

    graphics.clear();

    overrideCells.forEach((cell) => {
      const { x, y, height, width } = calculateCellDimensions(cell);

      graphics
        .lineStyle(lineWidth, borderColor)
        .drawRect(x, y, width, height)
        .endFill();
    });
  }, [calculateCellDimensions, gridSizes, overrideCells, theme]);

  useDraw(draw);

  return (
    <Container zIndex={ComponentLayer.Override}>
      <Graphics ref={graphicsRef} />
    </Container>
  );
}
