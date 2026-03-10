import { useCallback, useContext } from 'react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { getPx } from '../../../utils';
import { CurrentCell, EditorStyle } from '../types';
import { getCellEditorWidth } from '../utils';

type Props = {
  currentCell: CurrentCell;
  editorStyle: EditorStyle;
  setEditorStyle: (
    editorStyle: EditorStyle | ((prev: EditorStyle) => EditorStyle),
  ) => void;
  zoom: number;
  columnSizes: Record<string, number>;
};

export function useCellEditorStyle({
  currentCell,
  editorStyle,
  setEditorStyle,
  zoom,
  columnSizes,
}: Props) {
  const { getCellX } = useContext(GridViewportContext);
  const { gridSizes, canvasId } = useContext(GridStateContext);

  const updateCellEditorStyle = useCallback(
    (newCode: string) => {
      if (!currentCell) return;

      setEditorStyle((prev) => {
        const { col } = currentCell;
        const x = getCellX(col);
        const currentWidth = parseInt(prev.width);

        const width = getCellEditorWidth({
          gridSizes,
          x,
          value: newCode,
          valueColumn: col,
          zoom,
          initial: false,
          currentWidth,
          columnSizes,
          canvasId,
        });

        return {
          ...prev,
          width: getPx(width),
        };
      });
    },
    [
      canvasId,
      columnSizes,
      currentCell,
      editorStyle.width,
      getCellX,
      gridSizes,
      setEditorStyle,
      zoom,
    ],
  );

  return {
    updateCellEditorStyle,
  };
}
