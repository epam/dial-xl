import { useCallback, useContext } from 'react';

import {
  ApplyFilter,
  ApplySort,
  dynamicFieldName,
  FieldsReferenceExpression,
  ParsedField,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import {
  findTablesInSelection,
  getProjectSheetsRecord,
  isTableInsideSelection,
} from '../../utils';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';
import { useSpreadsheetSelection } from '../useSpreadsheetSelection';
import { useDSLUtils } from './useDSLUtils';
import { useOverridesEditDsl } from './useOverridesEditDsl';
import { useTableEditDsl } from './useTableEditDsl';
import { useTotalEditDsl } from './useTotalEditDsl';

export function useDeleteEntityDsl() {
  const { updateSelectionAfterDataChanged } = useSpreadsheetSelection();
  const { projectSheets } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const {
    updateDSL,
    findEditContext,
    findTable,
    findTableField,
    getFormulaSchema,
  } = useDSLUtils();
  const { deleteTable, deleteTables } = useTableEditDsl();
  const { removeOverride } = useOverridesEditDsl();
  const { removeTotalByIndex } = useTotalEditDsl();
  const gridApi = useGridApi();

  const deleteField = useCallback(
    async (tableName: string, fieldName: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context || !context.parsedField || !projectSheets) return;

      const {
        sheet,
        sheetContent,
        sheetName,
        parsedTable,
        parsedField,
        table,
      } = context;

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
      if (parsedTotal && parsedTotal.size > 0 && table.totals.length > 0) {
        const fieldTotals = parsedTotal.getFieldTotal(targetFieldName);

        if (fieldTotals) {
          for (const [rowStr] of Object.entries(fieldTotals)) {
            const row = Number(rowStr);
            const targetTotal = table.getTotal(row - 1);
            targetTotal.removeField(targetFieldName);
          }

          table.cleanUpTotals();
        }
      }

      const isDynamicField = targetFieldName === dynamicFieldName;
      const targetGroupFields = parsedTable.fields.filter(
        (f) => f.fieldGroupIndex === targetParsedField.fieldGroupIndex
      );
      const targetExpression = targetParsedField.expression;
      const isFieldReferenceFormula =
        targetExpression instanceof FieldsReferenceExpression;
      const targetFieldGroupIndex = targetGroupFields.findIndex(
        (f) => f.key.fieldName === targetFieldName
      );

      const formulaFieldsCount =
        isFieldReferenceFormula && targetExpression.fields
          ? targetExpression.fields.length
          : 0;

      // Field is dynamic or only one in the field group
      if (isDynamicField || targetGroupFields.length === 1) {
        table.removeField(targetFieldName);
      } else if (
        isFieldReferenceFormula &&
        formulaFieldsCount === targetGroupFields.length
      ) {
        // Formula is a FieldsReferenceExpression, so it is possible to remove the field from the formula
        const { start, globalOffsetStart, fields } = targetExpression;
        fields.splice(targetFieldGroupIndex, 1);
        const fieldsReferencePart = fields.map((f) => f).join(', ');
        const normalizedFieldsReferencePart =
          fields.length > 1 ? `[${fieldsReferencePart}]` : fieldsReferencePart;
        const fixedFormula =
          sheetContent.substring(globalOffsetStart, start) +
          normalizedFieldsReferencePart;
        table.setFieldFormula(targetFieldName, fixedFormula);
        table.removeField(targetFieldName);
      } else {
        // Otherwise, make dim schema request to create FieldsReference formula part
        const formula = targetParsedField.expressionMetadata?.text || '';

        const { schema, errorMessage } = await getFormulaSchema(
          formula,
          getProjectSheetsRecord(projectSheets)
        );

        if (!errorMessage && schema.length >= targetFieldGroupIndex) {
          schema.splice(targetFieldGroupIndex, 1);
          const fieldsReferencePart = schema.map((f) => `[${f}]`).join(', ');
          const normalizedFieldsReferencePart =
            schema.length > 1
              ? `[${fieldsReferencePart}]`
              : fieldsReferencePart;
          const fixedFormula = formula + normalizedFieldsReferencePart;
          table.setFieldFormula(targetFieldName, fixedFormula);
        }

        table.removeField(targetFieldName);
      }

      const historyTitle = `Delete column [${fieldName}] from table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });

      updateSelectionAfterDataChanged();
    },
    [
      deleteTable,
      findEditContext,
      getFormulaSchema,
      projectSheets,
      updateDSL,
      updateSelectionAfterDataChanged,
    ]
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

      let { fieldName } = field.key;

      const startCell = gridApi.getCell(startCol, startRow);
      const endCell = gridApi.getCell(startCol, endRow);

      if (startCell?.totalIndex) {
        removeTotalByIndex(tableName, fieldName, startCell.totalIndex);

        return;
      }

      if (field.isDynamic) {
        field = findTableField(tableName, dynamicFieldName);

        if (!field) return;
      }

      fieldName = field.key.fieldName;

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
