import {
  GridCell,
  isOtherCellsInFieldDataHasOverrides,
} from '@frontend/common';
import {
  extractExpression,
  getTokens,
  naExpression,
  SheetLexer,
  unescapeFieldName,
  unescapeTableName,
  unescapeValue,
} from '@frontend/parser';

import { GridApi } from '../../../types';
import {
  GridCellEditorMode,
  GridCellEditorOpenOptions,
  GridCellParams,
} from '../types';
import { isCellEditorValueFormula, isOtherCellsInField } from './utils';

const isFormulaValue = (value: string) => {
  const tokens = getTokens(value);

  if (tokens.length === 0) return false;

  const allTokensAreNonFormula = tokens.every((token) =>
    [SheetLexer.STRING_LITERAL, SheetLexer.FLOAT].includes(token.type)
  );

  return !allTokensAreNonFormula;
};

const getCellOptions = (
  cell: GridCell | undefined,
  isOtherCellsInField: boolean | undefined
) => ({
  isTableHeader: !!cell?.isTableHeader,
  isTableField: !!cell?.isFieldHeader,
  isTableCell:
    cell && !cell?.isTableHeader && !cell?.isFieldHeader && !cell.totalIndex,
  isSingleOverrideInManualTable: cell?.table?.isManual && !isOtherCellsInField,
});

const getCellValues = (cell: GridCell | undefined) => ({
  fieldExpression: `=${
    cell?.field?.expression ? extractExpression(cell.field.expression) : ''
  }`,
  fieldValue: cell?.field?.expression || '',
  cellValue: cell?.value || '',
  overrideValue:
    typeof cell?.overrideValue === 'string'
      ? extractExpression(cell.overrideValue)
      : cell?.overrideValue || '',
});

const accumulateOverrideValue = (
  fieldValue: string,
  overrideValue: string | number,
  fieldExpression: string,
  initialValue: string | undefined
) => {
  let value = initialValue || unescapeValue(overrideValue.toString()) || '';
  if (fieldValue !== naExpression && !initialValue && !overrideValue)
    value = fieldExpression || '';

  return value === naExpression ? initialValue || '' : value;
};

const accumulateEditOverrideValue = (
  cellValue: string,
  overrideValue: string | number,
  initialValue: string | undefined
) => {
  return overrideValue &&
    !initialValue &&
    isFormulaValue(overrideValue.toString())
    ? `=${overrideValue}`
    : initialValue || cellValue;
};

const determineFormula = (
  hasOtherOverrides: boolean | undefined,
  overrideValue: string | number,
  cell: GridCell | undefined,
  possibleValue: string
) =>
  (!hasOtherOverrides &&
    !overrideValue &&
    cell?.field?.expression &&
    cell?.field?.expression !== naExpression) ||
  isFormulaValue(possibleValue);

const determineCellExpressionMode = (
  isAlreadyOpened: boolean | undefined,
  hasOtherOverrides: boolean | undefined,
  isRenameShortcut: boolean | undefined,
  initialValue: string | undefined,
  isFormula: boolean,
  possibleValue: string
) =>
  !hasOtherOverrides &&
  (!isAlreadyOpened || !isRenameShortcut) &&
  (isCellEditorValueFormula(initialValue) ||
    (!initialValue && isFormula && possibleValue !== naExpression));

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
    isOtherCellsInField,
  } = options;

  const {
    isTableHeader,
    isTableField,
    isTableCell,
    isSingleOverrideInManualTable,
  } = getCellOptions(cell, isOtherCellsInField);
  const { fieldExpression, fieldValue, cellValue, overrideValue } =
    getCellValues(cell);

  let editMode: GridCellEditorMode = null;
  let value: string | number = initialValue ?? '';

  // Table Header
  if (isTableHeader) {
    if (explicitOpen) return { editMode: 'edit_dim_expression', value };

    return {
      editMode: 'rename_table',
      value: isRenameShortcut ? unescapeTableName(cellValue) : value,
    };
  }

  // Totals
  if (isAddTotal) {
    return { editMode: 'add_total', value };
  }

  if (isEditTotal) {
    return {
      editMode: 'edit_total',
      value: cell?.totalExpression
        ? `=${extractExpression(cell.totalExpression)}`
        : '=',
    };
  }

  // Table Field Header
  if (isTableField) {
    if (isRenameShortcut) {
      editMode = 'rename_field';
      value = unescapeFieldName(cellValue);
    } else if (isEditExpressionShortcut || explicitOpen) {
      editMode = 'edit_field_expression';
      value = initialValue || fieldExpression;
    } else if (onKeyDown) {
      editMode = value === '=' ? 'edit_field_expression' : 'rename_field';
    }
  }

  // Add/Edit Overrides
  if (isAddOverride || isEditOverride) {
    if (isAddOverride) {
      editMode = 'add_override';
      value = accumulateOverrideValue(
        fieldValue,
        overrideValue,
        fieldExpression,
        initialValue
      );
    } else if (isEditOverride) {
      editMode = 'edit_override';
      value = accumulateEditOverrideValue(
        cellValue,
        overrideValue,
        initialValue
      );
    }
    // Check for explicit open in formula bar or single override in a manual table
    if (
      (explicitOpen && formulaBarMode === 'value') ||
      (isSingleOverrideInManualTable && !isAlreadyOpened)
    ) {
      return { editMode, value: String(value) };
    }
  }

  // Handle cell expression editing in table cells
  const possibleValue =
    overrideValue.toString() || extractExpression(cell?.field?.expression);
  const isFormula = determineFormula(
    hasOtherOverrides,
    overrideValue,
    cell,
    possibleValue
  );
  if (
    isTableCell &&
    ((isEditExpressionShortcut && isAlreadyOpened) ||
      determineCellExpressionMode(
        isAlreadyOpened,
        hasOtherOverrides,
        isRenameShortcut,
        initialValue,
        isFormula,
        possibleValue
      ))
  ) {
    editMode = 'edit_cell_expression';
    value = initialValue || `=${possibleValue}`;
  }

  // Default to empty cell if no specific mode was assigned
  return { editMode: editMode || 'empty_cell', value: String(value) };
};

export const isEditableTableCell = (cell?: GridCell): boolean => {
  if (!cell) return false;

  return !cell.isTableHeader && !cell.isFieldHeader && !!cell.table;
};

export function getCellContextParams(
  api: GridApi,
  cell?: GridCell
): GridCellParams {
  const hasOtherOverrides = cell
    ? isOtherCellsInFieldDataHasOverrides(cell, api.getCell)
    : false;
  const hasOtherCellsInField =
    cell && api ? isOtherCellsInField(cell, api) : false;
  const isTableHeader = !!cell?.isTableHeader;
  const isTableField = !!cell?.isFieldHeader;
  const isTotalCell = !!cell?.totalIndex;
  const isTableCell = isEditableTableCell(cell);
  const isAddTotal = isTableCell && isTotalCell && !cell?.totalType;
  const isEditTotal = isTableCell && isTotalCell && !!cell?.totalType;

  return {
    isTableHeader,
    isTableField,
    isTableCell,
    isTotalCell,
    isAddTotal,
    isEditTotal,
    hasOtherOverrides,
    hasOtherCellsInField,
  };
}
