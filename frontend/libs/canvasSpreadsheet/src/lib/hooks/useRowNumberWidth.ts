import { useCallback, useContext, useEffect } from 'react';

import { GridStateContext, GridViewportContext } from '../context';
import { getFirstVisibleColOrRow, getSymbolWidth } from '../utils';

export const useRowNumberWidth = () => {
  const { gridSizes, theme, setRowNumberWidth, getBitmapFontName } =
    useContext(GridStateContext);
  const { gridViewportSubscriber, viewportCoords } =
    useContext(GridViewportContext);

  const handleViewportChange = useCallback(() => {
    const { cell } = gridSizes;
    const { cellFontFamily, cellFontColorName } = theme.cell;
    const y2 = viewportCoords.current.y2;
    const firstVisibleEndRow = getFirstVisibleColOrRow(y2, {}, cell.height);

    const newWidth =
      ((firstVisibleEndRow + '').length + 2) *
      getSymbolWidth(
        gridSizes.cell.fontSize,
        getBitmapFontName(cellFontFamily, cellFontColorName)
      );

    if (newWidth !== gridSizes.rowNumber.width) {
      setRowNumberWidth(newWidth);
    }
  }, [
    getBitmapFontName,
    gridSizes,
    setRowNumberWidth,
    theme.cell,
    viewportCoords,
  ]);

  useEffect(() => {
    const unsubscribe =
      gridViewportSubscriber.current.subscribe(handleViewportChange);

    return () => {
      unsubscribe();
    };
  });
};
