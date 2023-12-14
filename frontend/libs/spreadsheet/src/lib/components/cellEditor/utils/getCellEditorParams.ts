import { GridCell } from '../../../grid';
import { GridCellEditorMode, GridCellEditorOpenOptions } from '../types';

export const getCellEditorParams = (
  cell: GridCell | undefined,
  options: GridCellEditorOpenOptions,
  isTableHeader: boolean,
  isTableField: boolean,
  isTableCell: boolean
): { editMode: GridCellEditorMode; value: string } => {
  const {
    isEditExpression,
    isRenameShortcut,
    onKeyDown = false,
    isAddOverride,
    isEditOverride,
    explicitOpen = false,
    initialValue = '',
  } = options;

  const isExplicitEditOverride =
    isTableCell && cell?.isOverride && explicitOpen;
  const isExplicitAddOverride =
    isTableCell && !cell?.isOverride && explicitOpen;

  let editMode: GridCellEditorMode = null;
  let value = initialValue;

  if (isRenameShortcut && (isTableHeader || isTableField)) {
    editMode = isTableHeader ? 'rename_table' : 'rename_field';
    value = cell?.value || '';
  }

  if (!isRenameShortcut && isTableHeader) {
    editMode = 'rename_table';
  }

  if (!isRenameShortcut && (isEditExpression || explicitOpen) && isTableField) {
    editMode = 'edit_expression';
    value = cell?.field?.expression || '';
  }

  if (onKeyDown && isTableField && !editMode) {
    editMode = 'rename_field';
  }

  if (isAddOverride || isExplicitAddOverride) {
    if (!editMode && (!onKeyDown || isEditExpression)) {
      value = cell?.value || '';
    }
    editMode = 'add_override';
  }

  if (isEditOverride || isExplicitEditOverride) {
    value = cell?.value || '';
    editMode = 'edit_override';
  }

  return { editMode, value };
};
