import { useCallback, useContext, useMemo } from 'react';

import { GridStateContext } from '../../../context';
import { GridCell } from '../../../types';

export function useCellOptions() {
  const { getBitmapFontName, theme } = useContext(GridStateContext);

  const cellFontFamily = useMemo(() => theme.cell.cellFontFamily, [theme]);
  const boldCellFontFamily = useMemo(
    () => theme.cell.boldCellFontFamily,
    [theme],
  );
  const keyFontFamily = useMemo(() => theme.cell.boldCellFontFamily, [theme]);
  const indexFieldFontFamily = useMemo(
    () => theme.cell.boldCellFontFamily,
    [theme],
  );
  const indexCellFontFamily = useMemo(() => theme.cell.cellFontFamily, [theme]);
  const linkFontFamily = useMemo(() => theme.cell.linkFontFamily, [theme]);
  const hiddenCellFont = useMemo(() => theme.hiddenCell, [theme]);

  const {
    cellFontColor,
    boldCellFontColor,
    keyFontColor,
    indexFontColor,
    linkFontColor,
  } = theme.cell;
  const { fontColor: hiddenCellFontColor } = theme.hiddenCell;

  const fontName = useMemo(() => {
    return getBitmapFontName(cellFontFamily);
  }, [getBitmapFontName, cellFontFamily]);

  const boldCellFontName = useMemo(() => {
    return getBitmapFontName(boldCellFontFamily);
  }, [boldCellFontFamily, getBitmapFontName]);

  const keyCellFontName = useMemo(() => {
    return getBitmapFontName(keyFontFamily);
  }, [getBitmapFontName, keyFontFamily]);

  const indexFieldFontName = useMemo(() => {
    return getBitmapFontName(indexFieldFontFamily);
  }, [getBitmapFontName, indexFieldFontFamily]);

  const indexCellFontName = useMemo(() => {
    return getBitmapFontName(indexCellFontFamily);
  }, [getBitmapFontName, indexCellFontFamily]);

  const linkCellFontName = useMemo(() => {
    return getBitmapFontName(linkFontFamily);
  }, [getBitmapFontName, linkFontFamily]);

  const hiddenCellFontName = useMemo(() => {
    return getBitmapFontName(hiddenCellFont.fontFamily);
  }, [getBitmapFontName, hiddenCellFont.fontFamily]);

  const getFontNameAndColor = useCallback(
    (cell: GridCell | undefined) => {
      let font = fontName;
      let color = cellFontColor;

      if (cell?.isTableHeader) {
        font = boldCellFontName;
        color = boldCellFontColor;
      } else if (cell?.isFieldHeader) {
        font = boldCellFontName;
        color = boldCellFontColor;

        if (cell?.field?.isKey) {
          font = keyCellFontName;
          color = keyFontColor;
        } else if (cell?.field?.isIndex) {
          font = indexFieldFontName;
          color = indexFontColor;
        }
      }

      if (!cell?.isFieldHeader && cell?.field?.isKey) {
        font = boldCellFontName;
        color = boldCellFontColor;
      } else if (!cell?.isFieldHeader && cell?.field?.isIndex) {
        font = indexCellFontName;
        color = indexFontColor;
      }

      if (cell?.value && cell?.isUrl) {
        font = linkCellFontName;
        color = linkFontColor;
      }

      if (cell?.field?.isLoading && !cell.isFieldHeader) {
        font = hiddenCellFontName;
        color = hiddenCellFontColor;
      }

      return { font, color };
    },
    [
      boldCellFontColor,
      boldCellFontName,
      cellFontColor,
      fontName,
      hiddenCellFontColor,
      hiddenCellFontName,
      indexCellFontName,
      indexFieldFontName,
      indexFontColor,
      keyCellFontName,
      keyFontColor,
      linkCellFontName,
      linkFontColor,
    ],
  );

  return {
    getFontNameAndColor,
    fontName,
  };
}
