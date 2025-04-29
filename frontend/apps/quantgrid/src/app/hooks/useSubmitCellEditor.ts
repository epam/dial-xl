import { useCallback, useContext } from 'react';

import {
  GridCellEditorMode,
  isCellEditorValueFormula,
} from '@frontend/canvas-spreadsheet';
import {
  CellPlacement,
  defaultFieldName,
  getFormulaType,
  GridCell,
  isComplexType,
  isHiddenFieldCell,
  isHiddenTableHeaderCell,
  overrideComplexFieldMessage,
  overrideKeyFieldMessage,
  shouldNotOverrideCell,
} from '@frontend/common';
import { checkAndWrapExpression, escapeValue } from '@frontend/parser';

import { ProjectContext } from '../context';
import { createUniqueName } from '../services';
import {
  useCreateTableDsl,
  useFieldEditDsl,
  useOverridesEditDsl,
  useRenameFieldDsl,
  useTableEditDsl,
  useTotalEditDsl,
} from './EditDsl';
import { useAddTableRow } from './EditDsl/useAddTableRow';
import { useManualEditDSL } from './ManualEditDSL';
import { useGridApi } from './useGridApi';
import { useRequestDimTable } from './useRequestDimTable';

export const useSubmitCellEditor = () => {
  const gridApi = useGridApi();
  const { parsedSheet } = useContext(ProjectContext);
  const { editExpressionWithOverrideRemove } = useManualEditDSL();
  const { renameField } = useRenameFieldDsl();
  const { editExpression, addField, addFieldWithOverride } = useFieldEditDsl();
  const { renameTable } = useTableEditDsl();
  const { createDimensionTable, createSingleValueTable } = useCreateTableDsl();
  const { addTableRow } = useAddTableRow();
  const { createDimTableFromDimensionFormula, createDimTableFromFormula } =
    useRequestDimTable();
  const { addTotalExpression, editTotalExpression } = useTotalEditDsl();
  const { addOverride, editOverride } = useOverridesEditDsl();

  const submitEmptyCell = useCallback(
    (col: number, row: number, value: string) => {
      const currentCell = gridApi?.getCell(col, row);

      if (!value || currentCell?.table) {
        gridApi?.hideCellEditor();

        return;
      }

      const valueType = getFormulaType(value);

      if (valueType === 'multi_dim') {
        gridApi?.hideCellEditor();

        return createDimensionTable(col, row, value);
      }

      if (valueType === 'single_dim') {
        gridApi?.hideCellEditor();

        return createDimTableFromDimensionFormula(col, row, value);
      }

      const leftTableCell = gridApi?.getCell(Math.max(1, col - 1), row);
      const topTableCell = gridApi?.getCell(col, Math.max(1, row - 1));
      const rightTableCell = gridApi?.getCell(col + 1, row);
      const bottomTableCell = gridApi?.getCell(col, row + 1);

      const addFieldCell =
        leftTableCell?.table && !leftTableCell.table.isTableHorizontal
          ? leftTableCell
          : topTableCell?.table && topTableCell.table.isTableHorizontal
          ? topTableCell
          : undefined;
      const addRowCell =
        leftTableCell?.table && leftTableCell.table.isTableHorizontal
          ? leftTableCell
          : topTableCell?.table && !topTableCell.table.isTableHorizontal
          ? topTableCell
          : undefined;

      let editFieldNameCell;
      let editTableNameCell;

      const isBottomTableHeaderHidden =
        isHiddenTableHeaderCell(bottomTableCell);
      const isBottomTableFieldHeadersHidden = isHiddenFieldCell(
        bottomTableCell,
        true
      );
      const isRightTableFieldHidden = isHiddenFieldCell(rightTableCell, false);

      if (isBottomTableFieldHeadersHidden && bottomTableCell?.table) {
        editFieldNameCell = bottomTableCell;
      } else if (isBottomTableHeaderHidden && bottomTableCell?.table) {
        editTableNameCell = bottomTableCell;
      } else if (isRightTableFieldHidden && rightTableCell?.table) {
        editFieldNameCell = rightTableCell;
      }

      // table on left from the current cell
      if (addFieldCell?.table) {
        const { tableName } = addFieldCell.table;

        if (
          addFieldCell?.isFieldHeader ||
          addFieldCell.isTableHeader ||
          valueType === 'formula'
        ) {
          addField(tableName, value);
          gridApi?.hideCellEditor();

          return;
        }

        const tableFieldNames = parsedSheet?.tables
          .find((table) => table.tableName === addFieldCell?.table?.tableName)
          ?.fields.map((field) => field.key.fieldName);
        const newFieldName = createUniqueName(
          defaultFieldName,
          tableFieldNames
        );

        addFieldWithOverride({
          newFieldName,
          overrideCol: col,
          overrideRow: row,
          overrideValue: escapeValue(value),
          tableName: addFieldCell.table.tableName,
        });
        gridApi?.hideCellEditor();

        return;
      }

      // table on top of current cell
      if (addRowCell?.table) {
        const { tableName } = addRowCell.table;
        gridApi?.hideCellEditor();

        return addTableRow(
          col,
          row,
          tableName,
          valueType === 'formula' ? value.slice(1) : escapeValue(value)
        );
      }

      // table in right or bottom from current cell with hidden fields and table name headers
      if (editFieldNameCell?.table && editFieldNameCell.field?.fieldName) {
        const { tableName } = editFieldNameCell.table;

        renameField(tableName, editFieldNameCell.field?.fieldName, value, true);

        gridApi?.hideCellEditor();

        return;
      }

      // table in right or bottom from current cell with hidden fields and table name headers
      if (editTableNameCell?.table && editTableNameCell.field?.fieldName) {
        const { tableName } = editTableNameCell.table;

        renameTable(tableName, value, { showHeader: true });

        gridApi?.hideCellEditor();

        return;
      }

      gridApi?.hideCellEditor();

      if (!addRowCell?.table && valueType === 'const')
        return createSingleValueTable(col, row, value);

      if (!addRowCell?.table && valueType === 'formula')
        return createDimTableFromFormula(col, row, value);
    },
    [
      gridApi,
      createSingleValueTable,
      createDimTableFromFormula,
      createDimensionTable,
      createDimTableFromDimensionFormula,
      parsedSheet?.tables,
      addFieldWithOverride,
      addField,
      addTableRow,
      renameTable,
      renameField,
    ]
  );

  const submitCellEditor = useCallback(
    ({
      editMode,
      currentCell,
      cell,
      value,
      dimFieldName,
      openStatusModal,
    }: {
      editMode: GridCellEditorMode;
      currentCell: CellPlacement;
      cell: GridCell | undefined;
      value: string;
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

      switch (editMode) {
        case 'rename_table':
          renameTable(cellValue, value);

          return true;

        case 'rename_field':
          renameField(tableName, cellValue, value);

          return true;

        case 'edit_dim_expression':
          if (dimFieldName) {
            editExpression(tableName, dimFieldName, value);
          }

          return true;
        case 'edit_field_expression':
        case 'edit_cell_expression':
          if (
            cell?.isOverride &&
            cell.overrideIndex != null &&
            cell.overrideValue
          ) {
            if (trimmedValue === cell.overrideValue) return true;

            editExpressionWithOverrideRemove(
              tableName,
              fieldName,
              trimmedValue,
              cell.overrideIndex!,
              cell.overrideValue!
            );
          } else {
            if (trimmedValue === cell?.field?.expression) return true;

            editExpression(tableName, fieldName, trimmedValue);
          }

          return true;

        case 'add_override':
          if (cell?.table?.startRow !== undefined && !cell?.field?.isKey) {
            let finalValue = value;
            if (isCellEditorValueFormula(finalValue)) {
              finalValue = checkAndWrapExpression(trimmedValue);
            } else {
              finalValue = escapeValue(finalValue);
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

            addOverride(cell.col, cell.row, tableName, finalValue);
          }

          return true;

        case 'edit_override':
          if (cell?.overrideIndex !== undefined) {
            let finalValue = value;
            if (isCellEditorValueFormula(finalValue)) {
              finalValue = checkAndWrapExpression(trimmedValue);
            } else {
              finalValue = escapeValue(finalValue);
            }

            if (cell.overrideValue === finalValue) return true;

            editOverride(tableName, fieldName, cell.overrideIndex, finalValue);
          }

          return true;

        case 'add_total':
          if (cell?.totalIndex !== undefined) {
            addTotalExpression(tableName, fieldName, cell.totalIndex, value);
          }

          return true;
        case 'edit_total':
          if (cell?.totalIndex !== undefined) {
            editTotalExpression(tableName, fieldName, cell.totalIndex, value);
          }

          return true;
      }

      submitEmptyCell(col, row, value);

      return true;
    },
    [
      addOverride,
      addTotalExpression,
      editExpression,
      editExpressionWithOverrideRemove,
      editOverride,
      editTotalExpression,
      renameField,
      renameTable,
      submitEmptyCell,
    ]
  );

  return { submitCellEditor, submitEmptyCell };
};
