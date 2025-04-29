import { MutableRefObject, RefObject, useCallback } from 'react';

import { GridCell } from '@frontend/common';

import { GridApi } from '../../../types';
import { showFieldDottedSelection } from '../../../utils';
import { GridCellEditorMode } from '../types';
import { isCellEditorValueFormula } from '../utils';

type Props = {
  apiRef: RefObject<GridApi>;
  isDottedSelection: MutableRefObject<boolean>;
};

export function useCellEditorDottedSelection({
  apiRef,
  isDottedSelection,
}: Props) {
  const updateDottedSelectionVisibility = useCallback(
    (
      col: number | undefined,
      row: number | undefined,
      editMode: GridCellEditorMode,
      codeValue: string
    ) => {
      if (!apiRef.current || !col || !row) return;

      const api = apiRef.current;
      const cell = api.getCell(col, row);
      const isEmptyCellEditMode = editMode === 'empty_cell';
      const isFormulaInEmptyCell = isCellEditorValueFormula(
        codeValue,
        isEmptyCellEditMode
      );
      const isEditingFieldOrCellExpression =
        editMode === 'edit_field_expression' ||
        editMode === 'edit_cell_expression';

      const shouldShowDottedSelectionForAdjacentCell = (
        adjacentCell: GridCell | undefined,
        isHorizontal: boolean
      ): boolean => {
        return !!(
          !cell?.table &&
          adjacentCell?.table &&
          adjacentCell.table.isTableHorizontal === isHorizontal &&
          isFormulaInEmptyCell
        );
      };

      // Left cell of empty cell
      const leftCell = api.getCell(col - 1, row);
      if (shouldShowDottedSelectionForAdjacentCell(leftCell, false)) {
        if (!leftCell?.table) return;

        showFieldDottedSelection(
          { col, row },
          leftCell.table,
          leftCell.endCol,
          api
        );
        isDottedSelection.current = true;

        return;
      }

      // Left cell of empty cell
      const topCell = api.getCell(col, row - 1);
      if (shouldShowDottedSelectionForAdjacentCell(topCell, true)) {
        if (!topCell?.table) return;

        showFieldDottedSelection(
          { col, row },
          topCell.table,
          topCell.endCol,
          api
        );
        isDottedSelection.current = true;

        return;
      }

      if (isEditingFieldOrCellExpression && cell?.table) {
        showFieldDottedSelection(cell, cell.table, cell.endCol, api);
        isDottedSelection.current = true;

        return;
      }
    },
    [apiRef, isDottedSelection]
  );

  return {
    updateDottedSelectionVisibility,
  };
}
