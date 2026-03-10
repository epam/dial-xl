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
import { useDSLUtils } from './useDSLUtils';
import { useOverridesEditDsl } from './useOverridesEditDsl';
import { useTableEditDsl } from './useTableEditDsl';
import { useTotalEditDsl } from './useTotalEditDsl';

export function useDeleteEntityDsl() {
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

  const deleteFields = useCallback(
    async (tableName: string, fieldNames: string[]) => {
      const tableContext = findEditContext(tableName);

      if (!tableContext) return;

      const { sheet, sheetContent, sheetName, parsedTable, table } =
        tableContext;

      for (const fieldName of fieldNames) {
        const context = findEditContext(tableName, fieldName);
        if (!context || !context.parsedField || !projectSheets) return;

        const { parsedField } = context;

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
            const sortExpressions = sort.buildUpdatedSortArgs(
              targetFieldName,
              null,
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
              filterExpressions.length > 0
                ? filterExpressions.join(' AND ')
                : '';

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
          (f) => f.fieldGroupIndex === targetParsedField.fieldGroupIndex,
        );
        const targetExpression = targetParsedField.expression;
        const isFieldReferenceFormula =
          targetExpression instanceof FieldsReferenceExpression;
        const targetFieldGroupIndex = targetGroupFields.findIndex(
          (f) => f.key.fieldName === targetFieldName,
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
            fields.length > 1
              ? `[${fieldsReferencePart}]`
              : fieldsReferencePart;
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
            getProjectSheetsRecord(projectSheets),
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
      }

      if (table.fieldGroups.length === 0) {
        deleteTable(tableName);

        return;
      }

      const historyTitle = `Delete column${
        fieldNames.length > 1 ? 's' : ''
      } ${fieldNames.map((n) => `[${n}]`)} from table "${tableName}"`;

      updateDSL([
        {
          updatedSheetContent: sheet.toDSL(),
          sheetNameToChange: sheetName,
          historyTitle,
          tableName,
        },
      ]);
    },
    [deleteTable, findEditContext, getFormulaSchema, projectSheets, updateDSL],
  );

  const deleteField = useCallback(
    (tableName: string, fieldName: string) => {
      return deleteFields(tableName, [fieldName]);
    },
    [deleteFields],
  );

  const deleteSelectedFieldOrTable = useCallback(() => {
    if (!gridApi || gridApi?.isCellEditorOpen()) return;

    const selection = gridApi.selection$.getValue();

    if (!selection) return;

    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startCol = Math.min(selection.startCol, selection.endCol);
    const endCol = Math.max(selection.startCol, selection.endCol);

    const tableStructure = viewGridData.getGridTableStructure();
    const tableMetas = findTablesInSelection(tableStructure, selection);
    if (!tableMetas.length) return;

    const tableNamesToDelete: string[] = [];
    tableMetas.forEach((tableMeta) => {
      const { tableName } = tableMeta;
      const startRowCell = gridApi.getCell(startCol, startRow);
      const endRowCell = gridApi.getCell(startCol, endRow);
      const isChart = !!tableMeta.chartType;
      const tableHeaderRowSelected =
        startRowCell?.isTableHeader || endRowCell?.isTableHeader;
      const entireTableHeaderSelected =
        startCol === tableMeta.startCol && endCol === tableMeta.endCol;
      const entireTableSelected = isTableInsideSelection(tableMeta, selection);
      if (
        (tableHeaderRowSelected && entireTableHeaderSelected) ||
        entireTableSelected ||
        isChart
      ) {
        tableNamesToDelete.push(tableName);

        return;
      }

      const table = findTable(tableName);
      if (!table) return;

      const fieldNames = new Array(
        Math.abs(
          tableMeta.isTableHorizontal ? startRow - endRow : startCol - endCol,
        ) + 1,
      )
        .fill(0)
        .map((_, index) => {
          const col = tableMeta.isTableHorizontal
            ? Math.min(startCol, endCol)
            : Math.min(startCol, endCol) + index;
          const row = tableMeta.isTableHorizontal
            ? Math.min(startRow, endRow) + index
            : Math.min(startRow, endRow);

          return gridApi.getCell(col, row);
        })
        .filter((c) => c?.table?.tableName === tableName)
        .map((cell) => cell?.field?.fieldName)
        .filter(Boolean);
      const uniqueFields = Array.from(new Set(fieldNames))
        .map((fieldName) => findTableField(tableName, fieldName as string))
        .filter(Boolean);

      const isFieldsSelected =
        startRowCell?.isFieldHeader &&
        (tableMeta.isTableHorizontal
          ? startCol === endCol || endCol === tableMeta.endCol
          : startRow === endRow || endRow === tableMeta.endRow);
      if (uniqueFields.length !== 1) {
        if (isFieldsSelected) {
          deleteFields(
            tableName,
            uniqueFields
              .map((item) => item?.key.fieldName)
              .filter((item) => !!item) as string[],
          );

          return;
        }
      }

      let field = uniqueFields[0];
      if (!field) return;

      let { fieldName } = field.key;

      if (startRowCell?.totalIndex) {
        removeTotalByIndex(tableName, fieldName, startRowCell.totalIndex);

        return;
      }

      if (field.isDynamic) {
        field = findTableField(tableName, dynamicFieldName);

        if (!field) return;
      }

      fieldName = field.key.fieldName;

      if (
        isFieldsSelected &&
        (startRowCell?.isFieldHeader || endRowCell?.isFieldHeader)
      ) {
        deleteField(tableName, fieldName);

        return;
      } else {
        if (
          !startRowCell ||
          startRowCell.overrideIndex === undefined ||
          startRowCell.value === undefined
        )
          return;

        const currentCellFieldName = uniqueFields[0]?.key.fieldName;

        removeOverride(
          tableName,
          currentCellFieldName ?? fieldName,
          startRowCell.overrideIndex,
          startRowCell.value,
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
    deleteFields,
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
