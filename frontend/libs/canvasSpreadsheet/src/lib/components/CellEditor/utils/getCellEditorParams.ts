import {
  GridCell,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/common';
import {
  extractExpression,
  getTokens,
  naExpression,
  SheetLexer,
} from '@frontend/parser';

import { GridCellEditorMode, GridCellEditorOpenOptions } from '../types';
import { isCellEditorValueFormula } from './utils';

const isFormulaValue = (value: string) => {
  const tokens = getTokens(value);

  const isFormula =
    tokens.length > 0 &&
    !tokens.every((token) =>
      [SheetLexer.STRING_LITERAL, SheetLexer.FLOAT].includes(token.type)
    );

  return isFormula;
};

export const getCellEditorParams = (
  cell: GridCell | undefined,
  options: GridCellEditorOpenOptions
): { editMode: GridCellEditorMode; value: string } => {
  const {
    isEditExpressionShortcut,
    isRenameShortcut,
    onKeyDown = false,
    isAddOverride,
    isEditOverride,
    isAddTotal,
    isEditTotal,
    explicitOpen = false,
    initialValue,
    hasOtherOverrides,
    isAlreadyOpened,
    formulaBarMode,
  } = options;
  const isTableHeader = !!cell?.isTableHeader;
  const isTableField = !!cell?.isFieldHeader;
  const isTableCell =
    cell &&
    !isTableHeader &&
    !isTableField &&
    !cell.totalIndex &&
    !cell.isPlaceholder;

  const fieldExpression =
    (cell?.field?.expression &&
      `=${extractExpression(cell?.field?.expression)}`) ||
    '';
  const fieldValue = cell?.field?.expression || '';
  const cellValue = cell?.value || '';
  const overrideValue =
    cell?.overrideValue && typeof cell.overrideValue === 'string'
      ? extractExpression(cell.overrideValue)
      : cell?.overrideValue
      ? cell.overrideValue
      : '';
  let editMode: GridCellEditorMode = null;
  let value: string | number = initialValue ?? '';

  if (isRenameShortcut && (isTableHeader || isTableField)) {
    editMode = isTableHeader ? 'rename_table' : 'rename_field';
    value = isTableHeader
      ? unescapeTableName(cellValue)
      : unescapeFieldName(cellValue);
  }

  if (!isRenameShortcut && isTableHeader) {
    editMode = 'rename_table';
  }

  if (
    !isRenameShortcut &&
    isTableField &&
    (isEditExpressionShortcut || explicitOpen)
  ) {
    editMode = 'edit_field_expression';
    value = initialValue || fieldExpression;
  }

  if (explicitOpen && isTableHeader) {
    editMode = 'edit_dim_expression';
  }

  if (onKeyDown && isTableField && !editMode) {
    editMode = 'rename_field';

    if (value === '=') {
      editMode = 'edit_field_expression';
    }
  }

  if (isAddOverride) {
    value = initialValue ?? (overrideValue || '');

    if (
      fieldValue !== naExpression &&
      typeof initialValue === 'undefined' &&
      !overrideValue
    ) {
      value = fieldExpression || '';
    }
    if (value === naExpression) {
      value = initialValue ?? '';
    }

    editMode = 'add_override';

    if (explicitOpen && formulaBarMode === 'value') {
      return { editMode, value: (value ?? '') + '' };
    }
  }

  if (isEditOverride) {
    value = initialValue ?? cellValue;

    if (overrideValue && typeof overrideValue === 'string' && !initialValue) {
      if (isFormulaValue(overrideValue)) {
        value = `=${overrideValue}`;
      }
    }
    editMode = 'edit_override';

    if (explicitOpen && formulaBarMode === 'value') {
      return { editMode, value: value + '' };
    }
  }

  const possibleValue =
    overrideValue.toString() || extractExpression(cell?.field?.expression);
  const isNAExpression = possibleValue === naExpression;
  let isFormula = false;

  if (
    (!hasOtherOverrides &&
      !overrideValue &&
      cell?.field?.expression &&
      cell?.field?.expression !== naExpression) ||
    isFormulaValue(possibleValue)
  ) {
    isFormula = true;
  }

  if (isTableCell) {
    if (isEditExpressionShortcut && isAlreadyOpened) {
      editMode = 'edit_cell_expression';
      value = initialValue ?? `=${possibleValue}`;
    }
    if (
      !hasOtherOverrides &&
      (!isAlreadyOpened || !isRenameShortcut) &&
      (isCellEditorValueFormula(initialValue) ||
        (!initialValue && isFormula && !isNAExpression))
    ) {
      editMode = 'edit_cell_expression';
      value = initialValue ?? `=${possibleValue}`;
    }
  }

  if (isAddTotal) {
    editMode = 'add_total';
    value = initialValue ?? '';
  }

  if (isEditTotal) {
    editMode = 'edit_total';
    value = cell?.totalExpression
      ? `=${extractExpression(cell.totalExpression)}`
      : '=';
  }

  if (!editMode) {
    editMode = 'empty_cell';
  }

  return { editMode, value: (value ?? '') + '' };
};
