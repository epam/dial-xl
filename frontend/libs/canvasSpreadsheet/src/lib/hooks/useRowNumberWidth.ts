import { useCallback, useContext, useEffect } from 'react';

import { GridStateContext, GridViewportContext } from '../context';
import { getFirstVisibleColOrRow } from '../utils';

export const useRowNumberWidth = () => {
  const { gridSizes, setRowNumberWidth, showGridLines, canvasSymbolWidth } =
    useContext(GridStateContext);
  const { gridViewportSubscriber, viewportCoords } =
    useContext(GridViewportContext);

  const handleViewportChange = useCallback(() => {
    if (!showGridLines) return;

    const y2 = viewportCoords.current.y2;
    const firstVisibleEndRow = getFirstVisibleColOrRow(
      y2,
      {},
      gridSizes.cell.height,
    );

    let newWidth = ((firstVisibleEndRow + '').length + 2) * canvasSymbolWidth;

    newWidth = Math.max(newWidth, gridSizes.rowNumber.minWidth);

    if (newWidth !== gridSizes.rowNumber.width) {
      setRowNumberWidth(newWidth);
    }
  }, [
    showGridLines,
    viewportCoords,
    gridSizes.cell.height,
    gridSizes.rowNumber.minWidth,
    gridSizes.rowNumber.width,
    canvasSymbolWidth,
    setRowNumberWidth,
  ]);

  useEffect(() => {
    const unsubscribe =
      gridViewportSubscriber.current.subscribe(handleViewportChange);

    return () => {
      unsubscribe();
    };
  }, [gridViewportSubscriber, handleViewportChange]);
};
