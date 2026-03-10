import { RefObject, useCallback, useContext } from 'react';

import { GridStateContext } from '../../../context';
import { GridCell } from '../../../types';
import {
  showFieldDottedSelection,
  showFieldGroupDottedSelection,
} from '../../../utils';
import { GridCellEditorMode } from '../types';
import { isCellEditorValueFormula } from '../utils';

type Props = {
  isDottedSelection: RefObject<boolean>;
};

export function useCellEditorDottedSelection({ isDottedSelection }: Props) {
  const { getCell, showDottedSelection, hideDottedSelection } =
    useContext(GridStateContext);

  const updateDottedSelectionVisibility = useCallback(
    (
      col: number | undefined,
      row: number | undefined,
      editMode: GridCellEditorMode,
      codeValue: string,
    ) => {
      if (!col || !row) return;

      const cell = getCell(col, row);
      const isEmptyCellEditMode = editMode === 'empty_cell';
      const isFormulaInEmptyCell = isCellEditorValueFormula(
        codeValue,
        isEmptyCellEditMode,
      );

      const isEditingFieldOrCellExpression =
        editMode === 'edit_field_expression' ||
        editMode === 'edit_cell_expression' ||
        editMode === 'edit_complex_field';

      const shouldShowDottedSelectionForAdjacentCell = (
        adjacentCell: GridCell | undefined,
        isHorizontal: boolean,
      ): boolean => {
        return !!(
          !cell?.table &&
          adjacentCell?.table &&
          adjacentCell.table.isTableHorizontal === isHorizontal &&
          isFormulaInEmptyCell
        );
      };

      // Left cell of empty cell
      const leftCell = getCell(col - 1, row);
      if (shouldShowDottedSelectionForAdjacentCell(leftCell, false)) {
        if (!leftCell?.table) return;

        showFieldDottedSelection(
          { col, row },
          leftCell.table,
          leftCell.endCol,
          showDottedSelection,
        );
        isDottedSelection.current = true;

        return;
      }

      // Left cell of empty cell
      const topCell = getCell(col, row - 1);
      if (shouldShowDottedSelectionForAdjacentCell(topCell, true)) {
        if (!topCell?.table) return;

        showFieldDottedSelection(
          { col, row },
          topCell.table,
          topCell.endCol,
          showDottedSelection,
        );
        isDottedSelection.current = true;

        return;
      }

      // Correct edit mode for existing table cell
      if (isEditingFieldOrCellExpression && cell?.table) {
        showFieldGroupDottedSelection(cell, cell.table, showDottedSelection);
        isDottedSelection.current = true;

        return;
      }

      // Hide selection for existing table cell and incorrect edit mode
      if (!isEmptyCellEditMode && editMode) {
        hideDottedSelection();
        isDottedSelection.current = false;

        return;
      }
    },
    [getCell, hideDottedSelection, isDottedSelection, showDottedSelection],
  );

  return {
    updateDottedSelectionVisibility,
  };
}
