import { RefObject, useCallback } from 'react';

import { GridApi } from '../../../types';
import { CurrentCell, EditorStyle } from '../types';
import { getCellEditorWidthPx } from '../utils';

type Props = {
  apiRef: RefObject<GridApi>;
  currentCell: CurrentCell;
  editorStyle: EditorStyle;
  setEditorStyle: (
    editorStyle: EditorStyle | ((prev: EditorStyle) => EditorStyle)
  ) => void;
  zoom: number;
};

export function useCellEditorStyle({
  apiRef,
  currentCell,
  editorStyle,
  setEditorStyle,
  zoom,
}: Props) {
  const updateCellEditorStyle = useCallback(
    (newCode: string) => {
      if (!apiRef.current || !currentCell) return;

      const { col } = currentCell;
      const x = apiRef.current.getCellX(col);
      const currentWidth = parseInt(editorStyle.width);

      const width = getCellEditorWidthPx(
        apiRef.current,
        x,
        newCode,
        zoom,
        false,
        currentWidth
      );

      setEditorStyle((prev) => ({ ...prev, width }));
    },
    [apiRef, currentCell, editorStyle.width, setEditorStyle, zoom]
  );

  return {
    updateCellEditorStyle,
  };
}
