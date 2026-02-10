import { useCallback, useContext } from 'react';

import { GridViewportContext } from '../context';
import { Edges, Rectangle } from '../types';

export function useCellUtils() {
  const { getCellX, getCellY } = useContext(GridViewportContext);

  const calculateCellDimensions = useCallback(
    (cellEdges: Edges): Rectangle => {
      const { startRow, endRow, endCol, startCol } = cellEdges;

      const x1 = getCellX(startCol);
      const y1 = getCellY(startRow);

      const x2 = getCellX(endCol + 1);
      const y2 = getCellY(endRow + 1);

      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);

      return { x: x1, y: y1, width, height };
    },
    [getCellX, getCellY]
  );

  const getDashedRectPolygons = useCallback(
    (selection: Edges, offset = 2) => {
      const { startCol, startRow, endRow, endCol } = selection;

      const startX = startCol < endCol ? getCellX(startCol) : getCellX(endCol);
      const startY = startRow < endRow ? getCellY(startRow) : getCellY(endRow);

      const endX =
        startCol < endCol ? getCellX(endCol + 1) : getCellX(startCol + 1);
      const endY =
        startRow < endRow ? getCellY(endRow + 1) : getCellY(startRow + 1);

      return [
        { x: startX + offset, y: startY + offset },
        { x: startX + offset, y: endY - offset },
        { x: endX - offset, y: endY - offset },
        { x: endX - offset, y: startY + offset },
      ];
    },
    [getCellX, getCellY]
  );

  return {
    calculateCellDimensions,
    getDashedRectPolygons,
  };
}
