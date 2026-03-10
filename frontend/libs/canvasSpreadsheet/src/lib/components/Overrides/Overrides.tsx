import { Graphics } from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { naExpression } from '@frontend/parser';

import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { Edges } from '../../types';

const debounceDelay = 50;

type Props = {
  zIndex: number;
};

export function Overrides({ zIndex }: Props) {
  const { theme, gridSizes, getCell } = useContext(GridStateContext);
  const {
    viewportEdges,
    viewportRowCount,
    viewportColCount,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);
  const { calculateCellDimensions } = useCellUtils();

  const graphicsRef = useRef<Graphics>(null);
  const [overrideCells, setOverrideCells] = useState<Edges[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateOverrideCells = useCallback(() => {
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

  const onViewportChange = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      updateOverrideCells();
    }, debounceDelay);
  }, [updateOverrideCells]);

  useEffect(() => {
    updateOverrideCells();

    const unsubscribe =
      gridViewportSubscriber.current.subscribe(onViewportChange);

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [gridViewportSubscriber, onViewportChange, updateOverrideCells]);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    const { borderColor } = theme.override;
    const { width: lineWidth } = gridSizes.override;

    graphics.clear();

    overrideCells.forEach((cell) => {
      const { x, y, height, width } = calculateCellDimensions(cell);

      graphics
        .rect(x, y, width, height)
        .stroke({ width: lineWidth, color: borderColor });
    });
  }, [calculateCellDimensions, gridSizes, overrideCells, theme]);

  useDraw(draw);

  return (
    <pixiContainer label="Overrides" zIndex={zIndex}>
      <pixiGraphics
        draw={() => {}}
        label="OverridesGraphics"
        ref={graphicsRef}
      />
    </pixiContainer>
  );
}
