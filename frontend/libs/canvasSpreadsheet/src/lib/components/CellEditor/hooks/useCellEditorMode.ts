import { RefObject, useCallback } from 'react';

import { FormulaBarMode } from '@frontend/common';

import { GridApi } from '../../../types';
import { CurrentCell, GridCellEditorMode } from '../types';
import { isCellEditorValueFormula, isCellValueTypeChanged } from '../utils';

type Props = {
  apiRef: RefObject<GridApi>;
  formulaBarMode: FormulaBarMode;
  openedExplicitly: boolean;
  currentCell: CurrentCell;
  setEditMode: (editMode: GridCellEditorMode) => void;
  editMode: GridCellEditorMode;
  updateDottedSelectionVisibility: (
    col: number | undefined,
    row: number | undefined,
    editMode: GridCellEditorMode,
    codeValue: string
  ) => void;
};

export function useCellEditorMode({
  apiRef,
  formulaBarMode,
  openedExplicitly,
  currentCell,
  setEditMode,
  editMode,
  updateDottedSelectionVisibility,
}: Props) {
  const updateEditModeOnCodeChange = useCallback(
    (newCodeValue: string, oldCodeValue: string) => {
      if (!apiRef.current || !currentCell || !editMode) return;
      if (openedExplicitly && formulaBarMode === 'value') return;

      const api = apiRef.current;
      const { col, row } = currentCell;
      const cell = api.getCell(col, row);

      const isRenaming = ['rename_table', 'rename_field'].includes(editMode);
      const isEmptyCellEditMode = editMode === 'empty_cell';
      const isEditingOverride = ['edit_override', 'add_override'].includes(
        editMode
      );
      const isEditingExpression =
        editMode === 'edit_cell_expression' ||
        editMode === 'edit_field_expression';

      const isTypeChanged = isCellValueTypeChanged(newCodeValue, oldCodeValue);
      const isTableCell = !cell?.isTableHeader && !cell?.isFieldHeader;
      const isOverride = !!cell?.isOverride;
      const otherCellsInFieldHasOverrides = !!cell?.field?.hasOverrides;

      // Handle renaming modes
      if (isRenaming) {
        const shouldSwitchToEditFieldExpression =
          editMode === 'rename_field' && newCodeValue === '=';

        if (shouldSwitchToEditFieldExpression) {
          setEditMode('edit_field_expression');
          updateDottedSelectionVisibility(
            col,
            row,
            'edit_cell_expression',
            newCodeValue
          );

          return;
        }

        api.hideDottedSelection();

        return;
      }

      if (!isTableCell) return;

      if (isEmptyCellEditMode) {
        if (isCellEditorValueFormula(newCodeValue, true)) {
          updateDottedSelectionVisibility(col, row, 'empty_cell', newCodeValue);
        }

        return;
      }

      // No other overrides exists
      if (cell && !otherCellsInFieldHasOverrides && isTypeChanged) {
        const isNewValueFormula = isCellEditorValueFormula(newCodeValue);

        // Switch from cell value to cell formula value
        if (isEditingOverride && isNewValueFormula) {
          setEditMode('edit_cell_expression');
          updateDottedSelectionVisibility(
            col,
            row,
            'edit_cell_expression',
            newCodeValue
          );

          return;
        }

        // Switch from cell expression edit to cell value edit
        const isSortedOrFiltered = cell.field?.isFiltered || cell.field?.sort;
        if (isEditingExpression && !isNewValueFormula && !isSortedOrFiltered) {
          const nextEditMode = isOverride ? 'edit_override' : 'add_override';
          setEditMode(nextEditMode);
          updateDottedSelectionVisibility(col, row, nextEditMode, newCodeValue);

          return;
        }
      }
    },
    [
      apiRef,
      currentCell,
      editMode,
      formulaBarMode,
      openedExplicitly,
      setEditMode,
      updateDottedSelectionVisibility,
    ]
  );

  return {
    updateEditModeOnCodeChange,
  };
}
