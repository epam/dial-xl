import { useCallback, useContext, useEffect, useMemo } from 'react';

import { GridStateContext, GridViewportContext } from '../context';
import { getFirstVisibleColOrRow, getSymbolWidth } from '../utils';

export const useRowNumberWidth = () => {
  const { gridSizes, theme, setRowNumberWidth, getBitmapFontName } =
    useContext(GridStateContext);
  const { gridViewportSubscriber, viewportCoords } =
    useContext(GridViewportContext);

  const fontName = useMemo(() => {
    return getBitmapFontName(
      theme.cell.cellFontFamily,
      theme.cell.cellFontColorName
    );
  }, [
    getBitmapFontName,
    theme.cell.cellFontColorName,
    theme.cell.cellFontFamily,
  ]);
  const symbolWidth = useMemo(() => {
    return getSymbolWidth(gridSizes.cell.fontSize, fontName);
  }, [fontName, gridSizes.cell.fontSize]);

  const handleViewportChange = useCallback(() => {
    const y2 = viewportCoords.current.y2;
    const firstVisibleEndRow = getFirstVisibleColOrRow(
      y2,
      {},
      gridSizes.cell.height
    );

    let newWidth = ((firstVisibleEndRow + '').length + 2) * symbolWidth;

    newWidth = Math.max(newWidth, gridSizes.rowNumber.minWidth);

    if (newWidth !== gridSizes.rowNumber.width) {
      setRowNumberWidth(newWidth);
    }
  }, [
    viewportCoords,
    gridSizes.cell.height,
    gridSizes.rowNumber.minWidth,
    gridSizes.rowNumber.width,
    symbolWidth,
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
