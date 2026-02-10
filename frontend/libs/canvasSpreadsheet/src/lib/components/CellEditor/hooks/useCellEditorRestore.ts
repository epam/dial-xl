import { RefObject, useCallback } from 'react';

import { GridApi } from '../../../types';
import { CurrentCell } from '../types';
import { isEditableTableCell } from '../utils';

type Props = {
  apiRef: RefObject<GridApi>;
  currentCell: CurrentCell;
  editedCalculatedCellValue: string;
  setEditedCalculatedCellValue: (value: string) => void;
};

export function useCellEditorRestore({
  apiRef,
  currentCell,
  editedCalculatedCellValue,
  setEditedCalculatedCellValue,
}: Props) {
  const restoreSelection = useCallback(() => {
    if (!apiRef.current || !currentCell) return;

    const api = apiRef.current;
    const { col, row } = currentCell;
    const selection = apiRef.current.selection$.getValue();
    const isSelectionDifferent =
      !selection ||
      (selection && selection.startRow !== row && selection.startCol !== col);

    if (!isSelectionDifferent) return;

    const cell = api.getCell(col, row);
    const endCol = cell?.endCol ?? col;

    api.updateSelection({
      startRow: row,
      startCol: col,
      endRow: row,
      endCol,
    });
  }, [apiRef, currentCell]);

  const restoreCellValue = useCallback(() => {
    if (!apiRef.current || !currentCell || !editedCalculatedCellValue) return;

    const api = apiRef.current;
    const { col, row } = currentCell;
    const cell = api.getCell(col, row);

    if (isEditableTableCell(cell)) {
      api.setCellValue(col, row, editedCalculatedCellValue);
      setEditedCalculatedCellValue('');
    }
  }, [
    apiRef,
    currentCell,
    editedCalculatedCellValue,
    setEditedCalculatedCellValue,
  ]);

  return {
    restoreSelection,
    restoreCellValue,
  };
}
