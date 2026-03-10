import { useCallback, useContext } from 'react';

import { GridStateContext } from '../../../context';
import { CurrentCell } from '../types';
import { isEditableTableCell } from '../utils';

type Props = {
  currentCell: CurrentCell;
  editedCalculatedCellValue: string;
  setEditedCalculatedCellValue: (value: string) => void;
};

export function useCellEditorRestore({
  currentCell,
  editedCalculatedCellValue,
  setEditedCalculatedCellValue,
}: Props) {
  const { selectionEdges, getCell, setSelectionEdges, setCellValue } =
    useContext(GridStateContext);

  const restoreSelection = useCallback(() => {
    if (!currentCell) return;

    const { col, row } = currentCell;
    const isSelectionDifferent =
      !selectionEdges ||
      (selectionEdges &&
        selectionEdges.startRow !== row &&
        selectionEdges.startCol !== col);

    if (!isSelectionDifferent) return;

    const cell = getCell(col, row);
    const endCol = cell?.endCol ?? col;

    setSelectionEdges({
      startRow: row,
      startCol: col,
      endRow: row,
      endCol,
    });
  }, [currentCell, getCell, selectionEdges, setSelectionEdges]);

  const restoreCellValue = useCallback(() => {
    if (!currentCell || !editedCalculatedCellValue) return;

    const { col, row } = currentCell;
    const cell = getCell(col, row);

    if (isEditableTableCell(cell)) {
      setCellValue(col, row, editedCalculatedCellValue);
      setEditedCalculatedCellValue('');
    }
  }, [
    currentCell,
    editedCalculatedCellValue,
    getCell,
    setCellValue,
    setEditedCalculatedCellValue,
  ]);

  return {
    restoreSelection,
    restoreCellValue,
  };
}
