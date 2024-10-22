import { useCallback, useContext } from 'react';

import { defaultFieldName, getFormulaType } from '@frontend/common';
import { escapeOverrideValue } from '@frontend/parser';

import { ProjectContext } from '../context';
import { createUniqueName } from '../services';
import {
  useManualAddTableRowDSL,
  useManualCreateEntityDSL,
  useManualEditDSL,
} from './ManualEditDSL';
import { useGridApi } from './useGridApi';
import { useRequestDimTable } from './useRequestDimTable';

export const useSubmitCellEditor = () => {
  const gridApi = useGridApi();
  const { parsedSheet } = useContext(ProjectContext);
  const {
    addField,
    addFieldWithOverride,
    renameFieldWithHeaderDisplay,
    renameTableWithHeaderDisplay,
  } = useManualEditDSL();
  const { createDimensionTable, createSingleValueManualTable } =
    useManualCreateEntityDSL();
  const { addTableRow } = useManualAddTableRowDSL();
  const { createDimTableFromDimensionFormula, createDimTableFromFormula } =
    useRequestDimTable();

  const submitCellEditor = useCallback(
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
      const editFieldNameCell = currentCell?.isPlaceholder
        ? rightTableCell?.table &&
          rightTableCell.table.isTableHorizontal &&
          rightTableCell.table.isTableFieldsHeaderHidden &&
          rightTableCell.table.isTableNameHeaderHidden
          ? rightTableCell
          : bottomTableCell?.table &&
            !bottomTableCell.table.isTableHorizontal &&
            bottomTableCell.table.isTableFieldsHeaderHidden &&
            bottomTableCell.table.isTableNameHeaderHidden
          ? bottomTableCell
          : undefined
        : undefined;
      const editTableNameCell = currentCell?.isPlaceholder
        ? bottomTableCell?.table &&
          !bottomTableCell.table.isTableFieldsHeaderHidden &&
          bottomTableCell.table.isTableNameHeaderHidden
          ? bottomTableCell
          : undefined
        : undefined;

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
          fieldText: newFieldName,
          overrideCol: col,
          overrideRow: row,
          overrideValue: escapeOverrideValue(value),
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
          valueType === 'formula' ? value.slice(1) : escapeOverrideValue(value)
        );
      }

      // table in right or bottom from current cell with hidden fields and table name headers
      if (editFieldNameCell?.table && editFieldNameCell.field?.fieldName) {
        const { tableName } = editFieldNameCell.table;

        renameFieldWithHeaderDisplay(
          tableName,
          editFieldNameCell.field?.fieldName,
          value
        );

        gridApi?.hideCellEditor();

        return;
      }

      // table in right or bottom from current cell with hidden fields and table name headers
      if (editTableNameCell?.table && editTableNameCell.field?.fieldName) {
        const { tableName } = editTableNameCell.table;

        renameTableWithHeaderDisplay(tableName, value);

        gridApi?.hideCellEditor();

        return;
      }

      gridApi?.hideCellEditor();

      if (!addRowCell?.table && valueType === 'const')
        return createSingleValueManualTable(col, row, value);

      if (!addRowCell?.table && valueType === 'formula')
        return createDimTableFromFormula(col, row, value);
    },
    [
      gridApi,
      createSingleValueManualTable,
      createDimTableFromFormula,
      createDimensionTable,
      createDimTableFromDimensionFormula,
      parsedSheet?.tables,
      addFieldWithOverride,
      addField,
      addTableRow,
      renameFieldWithHeaderDisplay,
      renameTableWithHeaderDisplay,
    ]
  );

  return { submitCellEditor };
};
