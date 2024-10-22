import { useCallback } from 'react';

import { SelectionEdges } from '@frontend/canvas-spreadsheet';
import { GridCell, GridData } from '@frontend/common';

import { SelectedCell, SelectedCellType } from '../common';

export function useSelectedCell() {
  const getSelectedCell = useCallback(
    (
      selectionEdges: SelectionEdges | null,
      data: GridData
    ): SelectedCell | null => {
      if (!selectionEdges) return null;

      const { startCol, startRow } = selectionEdges;

      let cell = data[startRow]?.[startCol];

      if (cell?.field && cell.startCol !== cell?.col) {
        cell = data[startRow]?.[cell.startCol];
      }

      if (!cell?.table) {
        return {
          type: SelectedCellType.EmptyCell,
          col: startCol,
          row: startRow,
        };
      }

      const { table, value } = cell;

      if (table?.startRow === undefined && !table?.startCol === undefined)
        return null;

      const type = getSelectionType(cell, cell.isOverride);

      return {
        tableName: cell.table?.tableName || '',
        fieldName: cell.field?.fieldName,
        overrideIndex: cell.overrideIndex,
        overrideValue: cell.overrideValue,
        totalIndex: cell.totalIndex,
        isDynamic: cell.field?.isDynamic,
        col: cell.col,
        row: cell.row,
        type,
        value,
      };
    },
    []
  );

  return {
    getSelectedCell,
  };
}

function getSelectionType(
  cell: GridCell,
  isOverride = false
): SelectedCellType {
  if (cell.isTableHeader) return SelectedCellType.Table;

  if (cell.isFieldHeader) return SelectedCellType.Field;

  if (cell.totalIndex) return SelectedCellType.Total;

  if (isOverride) return SelectedCellType.Override;

  return SelectedCellType.Cell;
}
