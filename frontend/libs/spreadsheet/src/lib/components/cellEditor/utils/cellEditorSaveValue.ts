import { tableRowOffset } from '@frontend/common';

import { GridCell } from '../../../grid';
import { GridCallbacks } from '../../../types';
import { CurrentCell, GridCellEditorMode } from '../types';

export const cellEditorSaveValue = (
  currentCell: CurrentCell,
  editMode: GridCellEditorMode,
  cell: GridCell | undefined,
  value: string,
  gridCallbacks: GridCallbacks
): boolean => {
  if (!currentCell) return true;

  const { col, row } = currentCell;

  const tableName = cell?.table?.tableName || '';
  const fieldName = cell?.field?.fieldName || '';
  const cellValue = cell?.value || '';

  if (editMode === 'rename_table') {
    gridCallbacks.onRenameTable?.(cellValue, value);

    return false;
  }

  if (editMode === 'rename_field') {
    gridCallbacks.onRenameField?.(tableName, cellValue, value);

    return false;
  }

  if (editMode === 'edit_expression') {
    gridCallbacks.onEditExpression?.(tableName, fieldName, value);

    return false;
  }

  if (editMode === 'add_override') {
    if (cell?.table?.startRow !== undefined && !cell?.field?.isKey) {
      gridCallbacks.onAddOverride?.(
        tableName,
        fieldName,
        cell.row - cell?.table.startRow - tableRowOffset,
        value
      );
    }

    return true;
  }

  if (editMode === 'edit_override') {
    if (cell?.overrideIndex !== undefined) {
      gridCallbacks.onEditOverride?.(
        tableName,
        fieldName,
        cell.overrideIndex,
        value
      );
    }

    return true;
  }

  gridCallbacks.onCellEditorSubmit?.(col, row, value);

  return false;
};
