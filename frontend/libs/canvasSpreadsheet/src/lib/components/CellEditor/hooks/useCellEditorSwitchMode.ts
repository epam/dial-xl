import { RefObject, useCallback, useContext } from 'react';

import { Shortcut } from '@frontend/common';

import { GridApi } from '../../../types';
import { CellEditorContext } from '../CellEditorContext';
import { CellEditorModes } from '../types';
import { getCellContextParams } from '../utils';

type Props = {
  apiRef: RefObject<GridApi>;
};
export function useCellEditorSwitchMode({ apiRef }: Props) {
  const { currentCell, editMode, restoreCellValue, displayCellEditor } =
    useContext(CellEditorContext);

  const switchToSecondaryEditMode = useCallback(() => {
    if (!apiRef.current || !editMode || !currentCell) return;

    const { subShortcut } = CellEditorModes[editMode];

    if (!subShortcut) return;

    restoreCellValue();

    const isEditExpressionShortcut = subShortcut === Shortcut.EditExpression;
    const isRenameShortcut = subShortcut === Shortcut.Rename;

    const { col, row } = currentCell;
    const cell = apiRef.current.getCell(col, row);
    const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
      getCellContextParams(apiRef.current, cell);

    displayCellEditor(col, row, {
      isEditExpressionShortcut: !isRenameShortcut && isEditExpressionShortcut,
      isRenameShortcut,
      onKeyDown: true,
      isAddOverride: isTableCell,
      isEditOverride: isTableCell && cell?.isOverride,
      isAddTotal,
      isEditTotal,
      hasOtherOverrides,
    });
  }, [apiRef, currentCell, displayCellEditor, editMode, restoreCellValue]);

  return {
    switchToSecondaryEditMode,
  };
}
