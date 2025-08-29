import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { GridCell } from '@frontend/common';

import { GridStateContext } from '../../../context';
import { getSymbolWidth } from '../../../utils';

export function useCellOptions() {
  const { getBitmapFontName, gridSizes, theme } = useContext(GridStateContext);

  const [symbolWidth, setSymbolWidth] = useState(0);

  const cellFontFamily = useMemo(() => theme.cell.cellFontFamily, [theme]);
  const cellFontColorName = useMemo(
    () => theme.cell.cellFontColorName,
    [theme]
  );
  const boldCellFontFamily = useMemo(
    () => theme.cell.boldCellFontFamily,
    [theme]
  );
  const boldCellFontColorName = useMemo(
    () => theme.cell.boldCellFontColorName,
    [theme]
  );
  const keyFontFamily = useMemo(() => theme.cell.boldCellFontFamily, [theme]);
  const keyFontColorName = useMemo(() => theme.cell.keyFontColorName, [theme]);
  const indexFieldFontFamily = useMemo(
    () => theme.cell.boldCellFontFamily,
    [theme]
  );
  const indexCellFontFamily = useMemo(() => theme.cell.cellFontFamily, [theme]);
  const indexFontColorName = useMemo(
    () => theme.cell.indexFontColorName,
    [theme]
  );
  const linkFontFamily = useMemo(() => theme.cell.linkFontFamily, [theme]);
  const linkFontColorName = useMemo(
    () => theme.cell.linkFontColorName,
    [theme]
  );

  const fontName = useMemo(() => {
    return getBitmapFontName(cellFontFamily, cellFontColorName);
  }, [getBitmapFontName, cellFontFamily, cellFontColorName]);

  const boldCellFontName = useMemo(() => {
    return getBitmapFontName(boldCellFontFamily, boldCellFontColorName);
  }, [boldCellFontColorName, boldCellFontFamily, getBitmapFontName]);

  const keyCellFontName = useMemo(() => {
    return getBitmapFontName(keyFontFamily, keyFontColorName);
  }, [getBitmapFontName, keyFontColorName, keyFontFamily]);

  const indexFieldFontName = useMemo(() => {
    return getBitmapFontName(indexFieldFontFamily, indexFontColorName);
  }, [getBitmapFontName, indexFontColorName, indexFieldFontFamily]);

  const indexCellFontName = useMemo(() => {
    return getBitmapFontName(indexCellFontFamily, indexFontColorName);
  }, [getBitmapFontName, indexFontColorName, indexCellFontFamily]);

  const linkCellFontName = useMemo(() => {
    return getBitmapFontName(linkFontFamily, linkFontColorName);
  }, [getBitmapFontName, linkFontColorName, linkFontFamily]);

  const getFontName = useCallback(
    (cell: GridCell | undefined) => {
      let font = fontName;

      if (cell?.isTableHeader) {
        font = boldCellFontName;
      } else if (cell?.isFieldHeader) {
        font = boldCellFontName;

        if (cell?.field?.isKey) {
          font = keyCellFontName;
        } else if (cell?.field?.isIndex) {
          font = indexFieldFontName;
        }
      }

      if (!cell?.isFieldHeader && cell?.field?.isKey) {
        font = boldCellFontName;
      } else if (!cell?.isFieldHeader && cell?.field?.isIndex) {
        font = indexCellFontName;
      }

      if (cell?.value && cell?.isUrl) {
        font = linkCellFontName;
      }

      return font;
    },
    [
      boldCellFontName,
      fontName,
      indexCellFontName,
      indexFieldFontName,
      keyCellFontName,
      linkCellFontName,
    ]
  );

  useEffect(() => {
    setSymbolWidth(getSymbolWidth(gridSizes.cell.fontSize, fontName));
  }, [fontName, gridSizes.cell.fontSize]);

  return {
    getFontName,
    symbolWidth,
    fontName,
  };
}
