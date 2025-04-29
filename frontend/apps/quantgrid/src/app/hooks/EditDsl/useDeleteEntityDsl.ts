import { useCallback, useContext } from 'react';

import {
  ApplyFilter,
  ApplySort,
  dynamicFieldName,
  ParsedField,
} from '@frontend/parser';

import { ViewportContext } from '../../context';
import { findTablesInSelection, isTableInsideSelection } from '../../utils';
import { useDSLUtils } from '../ManualEditDSL';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';
import { useSpreadsheetSelection } from '../useSpreadsheetSelection';
import { useOverridesEditDsl } from './useOverridesEditDsl';
import { useTableEditDsl } from './useTableEditDsl';
import { useTotalEditDsl } from './useTotalEditDsl';

export function useDeleteEntityDsl() {
  const { updateSelectionAfterDataChanged } = useSpreadsheetSelection();
  const { viewGridData } = useContext(ViewportContext);
  const { updateDSL, findEditContext, findTable, findTableField } =
    useDSLUtils();
  const { deleteTable, deleteTables } = useTableEditDsl();
  const { removeOverride } = useOverridesEditDsl();
  const { removeTotalByIndex } = useTotalEditDsl();
  const gridApi = useGridApi();

  const deleteField = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context || !context.parsedField) return;

      const { sheet, sheetName, parsedTable, parsedField, table } = context;

      if (parsedTable.getFieldsCount() === 1) {
        deleteTable(tableName);

        return;
      }

      let targetParsedField: ParsedField = parsedField;

      if (targetParsedField.isDynamic) {
        const targetContext = findEditContext(tableName, dynamicFieldName);
        if (
          !targetContext ||
          !targetContext.field ||
          !targetContext.parsedField
        )
          return;

        targetParsedField = targetContext.parsedField;
      }

      const targetFieldName = targetParsedField.key.fieldName;
      const {
        overrides: parsedOverrides,
        apply: parsedApply,
        total: parsedTotal,
      } = parsedTable;

      // Remove field override
      if (parsedOverrides) {
        parsedOverrides.removeField(fieldName);
        table.overrides = parsedOverrides.applyOverrides();
      }

      // Remove field sort/filter
      if (parsedApply && table.apply) {
        const { filter, sort } = parsedApply;

        if (
          sort &&
          table.apply.sort &&
          sort.isFieldUsedInSort(targetFieldName)
        ) {
          const sortExpressions = sort.getChangedFieldSort(
            targetFieldName,
            null
          );

          if (sortExpressions.length > 0) {
            const sort = new ApplySort();
            sortExpressions.forEach((e) => sort.append(e));
            table.apply.sort = sort;
          } else {
            table.apply.sort = null;
          }
        }

        if (filter && table.apply.filter) {
          const filterExpressions = filter.getFilterExpressionsWithModify({
            excludeFieldName: targetFieldName,
          });
          const combinedExpression =
            filterExpressions.length > 0 ? filterExpressions.join(' AND ') : '';

          if (combinedExpression) {
            table.apply.filter = new ApplyFilter(combinedExpression);
          } else {
            table.apply.filter = null;
          }
        }

        if (!table.apply.sort && !table.apply.filter) {
          table.apply = null;
        }
      }

      // Remove field total
      if (parsedTotal && parsedTotal.size > 0 && table.totalCount > 0) {
        const fieldTotals = parsedTotal.getFieldTotal(targetFieldName);

        if (fieldTotals) {
          for (const [rowStr] of Object.entries(fieldTotals)) {
            const row = Number(rowStr);
            const targetTotal = table.getTotal(row);
            targetTotal.removeField(targetFieldName);
          }

          table.cleanUpTotals();
        }
      }

      table.removeField(targetFieldName);

      const historyTitle = `Delete column [${fieldName}] from table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });

      updateSelectionAfterDataChanged();
    },
    [deleteTable, findEditContext, updateDSL, updateSelectionAfterDataChanged]
  );

  const deleteSelectedFieldOrTable = useCallback(() => {
    if (!gridApi || gridApi?.isCellEditorOpen()) return;

    const selection = gridApi.selection$.getValue();

    if (!selection) return;

    const { startCol, endCol, startRow, endRow } = selection;

    const tableStructure = viewGridData.getGridTableStructure();
    const tableMetas = findTablesInSelection(tableStructure, selection);
    if (!tableMetas.length) return;

    const tableNamesToDelete: string[] = [];
    tableMetas.forEach((tableMeta) => {
      const { tableName } = tableMeta;
      const startRowCell = gridApi.getCell(startCol, startRow);
      const endRowCell = gridApi.getCell(startCol, endRow);

      const tableHeaderRowSelected =
        startRowCell?.isTableHeader || endRowCell?.isTableHeader;
      const entireTableHeaderSelected =
        startCol === tableMeta.startCol && endCol === tableMeta.endCol;
      const entireTableSelected = isTableInsideSelection(tableMeta, selection);
      if (
        (tableHeaderRowSelected && entireTableHeaderSelected) ||
        entireTableSelected
      ) {
        tableNamesToDelete.push(tableName);

        return;
      }

      const table = findTable(tableName);
      if (!table) return;

      const fieldNames = new Array(Math.abs(startCol - endCol) + 1)
        .fill(0)
        .map((_, index) =>
          gridApi.getCell(Math.min(startCol, endCol) + index, startRow)
        )
        .filter((c) => c?.table?.tableName === tableName)
        .map((cell) => cell?.field?.fieldName)
        .filter(Boolean);
      const uniqueFields = Array.from(new Set(fieldNames))
        .map((fieldName) => findTableField(tableName, fieldName as string))
        .filter(Boolean);

      if (uniqueFields.length !== 1) {
        return;
      }

      let field = uniqueFields[0];
      if (!field) return;

      if (field.isDynamic) {
        field = findTableField(tableName, dynamicFieldName);

        if (!field) return;
      }

      const { fieldName } = field.key;
      const startCell = gridApi.getCell(startCol, startRow);
      const endCell = gridApi.getCell(startCol, endRow);

      if (startCell?.totalIndex) {
        removeTotalByIndex(tableName, fieldName, startCell.totalIndex);

        return;
      }

      if (startCell?.isFieldHeader || endCell?.isFieldHeader) {
        deleteField(tableName, fieldName);

        return;
      } else {
        if (
          !startCell ||
          startCell.overrideIndex === undefined ||
          startCell.value === undefined
        )
          return;

        const currentCellFieldName = uniqueFields[0]?.key.fieldName;

        removeOverride(
          tableName,
          currentCellFieldName ?? fieldName,
          startCell.overrideIndex,
          startCell.value
        );
      }
    });

    if (tableNamesToDelete.length > 1) {
      deleteTables(tableNamesToDelete);
    } else if (tableNamesToDelete.length === 1) {
      deleteTable(tableNamesToDelete[0]);
    }
  }, [
    deleteField,
    deleteTable,
    deleteTables,
    findTable,
    findTableField,
    gridApi,
    removeOverride,
    removeTotalByIndex,
    viewGridData,
  ]);

  return {
    deleteField: useSafeCallback(deleteField),
    deleteSelectedFieldOrTable: useSafeCallback(deleteSelectedFieldOrTable),
  };
}
