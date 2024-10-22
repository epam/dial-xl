import {
  CellPlacement,
  GridCell,
  isComplexType,
  overrideComplexFieldMessage,
  overrideKeyFieldMessage,
  shouldNotOverrideCell,
} from '@frontend/common';
import { checkAndWrapExpression, escapeOverrideValue } from '@frontend/parser';

import { GridCallbacks } from '../../../types';
import { GridCellEditorMode } from '../types';
import { isCellEditorValueFormula } from './utils';

type CellEditorGridSaveCallbacks = Pick<
  GridCallbacks,
  | 'onRenameTable'
  | 'onRenameField'
  | 'onEditExpression'
  | 'onEditExpressionWithOverrideRemove'
  | 'onAddOverride'
  | 'onEditOverride'
  | 'onAddTotalExpression'
  | 'onEditTotalExpression'
  | 'onCellEditorSubmit'
>;

// TODO: Move this business logic to the app level. Hide cell editor with grid api if needed.
export const cellEditorSaveValue = ({
  editMode,
  currentCell,
  cell,
  value,
  gridCallbacks,
  dimFieldName,
  openStatusModal,
}: {
  editMode: GridCellEditorMode;
  currentCell: CellPlacement;
  cell: GridCell | undefined;
  value: string;
  gridCallbacks: CellEditorGridSaveCallbacks;
  dimFieldName?: string;
  openStatusModal?: (text: string) => void;
}): boolean => {
  if (!currentCell) return true;

  const { col, row } = currentCell;

  const tableName = cell?.table?.tableName || '';
  const fieldName = cell?.field?.fieldName || '';
  const cellValue = cell?.value || '';
  const trimmedValue = isCellEditorValueFormula(value)
    ? value.trim().slice(1)
    : value;

  if (editMode === 'rename_table') {
    gridCallbacks.onRenameTable?.(cellValue, value);

    return false;
  }

  if (editMode === 'rename_field') {
    gridCallbacks.onRenameField?.(tableName, cellValue, value);

    return false;
  }

  if (editMode === 'edit_dim_expression' && dimFieldName) {
    gridCallbacks.onEditExpression?.(tableName, dimFieldName, value);

    return false;
  }

  if (
    editMode === 'edit_field_expression' ||
    editMode === 'edit_cell_expression'
  ) {
    if (cell?.isOverride && cell.overrideIndex != null && cell.overrideValue) {
      if (trimmedValue === cell.overrideValue) return true;

      gridCallbacks.onEditExpressionWithOverrideRemove?.(
        tableName,
        fieldName,
        trimmedValue,
        cell.overrideIndex!,
        cell.overrideValue!
      );
    } else {
      if (trimmedValue === cell?.field?.expression) return true;

      gridCallbacks.onEditExpression?.(tableName, fieldName, trimmedValue);
    }

    return true;
  }

  if (editMode === 'add_override') {
    if (cell?.table?.startRow !== undefined && !cell?.field?.isKey) {
      let finalValue = value;
      if (isCellEditorValueFormula(finalValue)) {
        finalValue = checkAndWrapExpression(trimmedValue);
      } else {
        finalValue = escapeOverrideValue(finalValue);
      }

      if (cell.field?.isKey) {
        openStatusModal?.(overrideKeyFieldMessage);

        return false;
      }

      if (isComplexType(cell?.field)) {
        openStatusModal?.(overrideComplexFieldMessage);

        return false;
      }

      if (shouldNotOverrideCell(cell)) {
        return false;
      }

      gridCallbacks.onAddOverride?.(cell.col, cell.row, tableName, finalValue);
    }

    return true;
  }

  if (editMode === 'edit_override') {
    if (cell?.overrideIndex !== undefined) {
      let finalValue = value;
      if (isCellEditorValueFormula(finalValue)) {
        finalValue = checkAndWrapExpression(trimmedValue);
      } else {
        finalValue = escapeOverrideValue(finalValue);
      }

      if (cell.overrideValue === finalValue) return true;

      gridCallbacks.onEditOverride?.(
        tableName,
        fieldName,
        cell.overrideIndex,
        finalValue
      );
    }

    return true;
  }

  if (editMode === 'add_total') {
    if (cell?.totalIndex !== undefined) {
      gridCallbacks.onAddTotalExpression?.(
        tableName,
        fieldName,
        cell.totalIndex,
        value
      );
    }

    return true;
  }

  if (editMode === 'edit_total') {
    if (cell?.totalIndex !== undefined) {
      gridCallbacks.onEditTotalExpression?.(
        tableName,
        fieldName,
        cell.totalIndex,
        value
      );
    }

    return true;
  }

  gridCallbacks.onCellEditorSubmit?.(col, row, value);

  return true;
};
