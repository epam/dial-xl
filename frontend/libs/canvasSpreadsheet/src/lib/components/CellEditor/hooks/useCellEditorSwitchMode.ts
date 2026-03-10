import { useCallback, useContext } from 'react';

import { Shortcut } from '@frontend/common';

import { GridCell } from '../../../types';
import { CellEditorContext } from '../CellEditorContext';
import { CellEditorModes } from '../types';
import { getCellContextParams } from '../utils';

type Props = {
  getCell: (col: number, row: number) => GridCell | undefined;
};
export function useCellEditorSwitchMode({ getCell }: Props) {
  const { currentCell, editMode, restoreCellValue, displayCellEditor } =
    useContext(CellEditorContext);

  const switchToSecondaryEditMode = useCallback(() => {
    if (!editMode || !currentCell) return;

    const { subShortcut } = CellEditorModes[editMode];

    if (!subShortcut) return;

    restoreCellValue();

    const isEditExpressionShortcut = subShortcut === Shortcut.EditExpression;
    const isRenameShortcut = subShortcut === Shortcut.Rename;

    const { col, row } = currentCell;
    const cell = getCell(col, row);
    const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
      getCellContextParams(cell);

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
  }, [currentCell, displayCellEditor, editMode, getCell, restoreCellValue]);

  return {
    switchToSecondaryEditMode,
  };
}
