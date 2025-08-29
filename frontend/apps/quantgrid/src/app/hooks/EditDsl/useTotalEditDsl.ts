import { useCallback, useContext } from 'react';

import { ColumnDataType, isComplexType, isNumericType } from '@frontend/common';
import {
  dynamicFieldName,
  naExpression,
  Total,
  TotalType,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { autoFixSingleExpression } from '../../services';
import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';
import { findFirstEmptyTotalIndex } from './utils';

export const numTotals: TotalType[] = [
  'count',
  'min',
  'max',
  'average',
  'stdevs',
];
export const textTotals: TotalType[] = ['count', 'min', 'max'];
export const tableTotals: TotalType[] = ['count'];

// TODO: In previous versions, total rows were 1-indexed.
// In current implementation of the Edit Dsl library, total rows are 0-indexed.
// In the future, we should update all frontend code to use 0-indexed total rows.
export const indexOffset = 1;

export function useTotalEditDsl() {
  const { viewGridData } = useContext(ViewportContext);
  const { functions, parsedSheets } = useContext(ProjectContext);
  const { updateDSL, findEditContext } = useDSLUtils();

  const removeTotalByIndex = useCallback(
    (tableName: string, fieldName: string, index: number) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { total } = parsedTable;

      if (!total || total?.size === 0 || !table.totals.length) return;

      const fieldTotals = total.getFieldTotal(fieldName);

      if (!fieldTotals || !fieldTotals[index]) return;

      const targetTotal = table.getTotal(index - indexOffset);
      targetTotal.removeField(fieldName);
      table.cleanUpTotals();

      const historyTitle = `Remove total ${index} from ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const removeTotalByType = useCallback(
    (tableName: string, fieldName: string, type: TotalType) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { total } = parsedTable;

      if (!total || total?.size === 0 || !table.totals.length) return;

      const fieldTotals = total.getFieldTotal(fieldName);

      if (!fieldTotals) return;

      for (const [rowStr, fieldTotal] of Object.entries(fieldTotals)) {
        if (fieldTotal.type === type) {
          const row = Number(rowStr);
          const targetTotal = table.getTotal(row - indexOffset);
          targetTotal.removeField(fieldName);
        }
      }

      table.cleanUpTotals();

      const historyTitle = `Remove total ${type.toUpperCase()} from ${tableName}[${fieldName}]`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [findEditContext, updateDSL]
  );

  const addTotalExpression = useCallback(
    (
      tableName: string,
      fieldName: string,
      index: number,
      expression: string
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { total: parsedTotal } = parsedTable;

      const fixedExpression = autoFixSingleExpression(
        expression,
        functions,
        parsedSheets,
        tableName
      );

      if (!parsedTotal || parsedTotal?.size === 0 || !table.totals.length) {
        const total = new Total();
        total.addField(fieldName, fixedExpression);
        table.totals.append(total);
      } else {
        const fieldTotals = parsedTotal.getTotalByIndex(index);
        if (fieldTotals.length === 0) {
          const total = new Total();
          total.addField(fieldName, fixedExpression);
          table.totals.append(total);
        } else {
          const targetTotal = table.getTotal(index - indexOffset);
          targetTotal.addField(fieldName, fixedExpression);
        }
      }

      const historyTitle = `Add total formula for the ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, functions, parsedSheets, updateDSL]
  );

  const editTotalExpression = useCallback(
    (
      tableName: string,
      fieldName: string,
      index: number,
      expression: string
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { total: parsedTotal } = parsedTable;

      if (!parsedTotal || parsedTotal?.size === 0 || !table.totals.length)
        return;

      const fieldTotals = parsedTotal.getFieldTotal(fieldName);

      if (!fieldTotals || !fieldTotals[index]) return;

      const fixedExpression = autoFixSingleExpression(
        expression,
        functions,
        parsedSheets,
        tableName
      );

      const targetTotal = table.getTotal(index - indexOffset);
      targetTotal.setFormula(fieldName, fixedExpression);

      const historyTitle = `Edit total formula for the ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, functions, parsedSheets, updateDSL]
  );

  const toggleTotalByType = useCallback(
    (tableName: string, fieldName: string, type: TotalType) => {
      const context = findEditContext(tableName, fieldName);
      if (!context || !context.parsedField) return;

      const { parsedTable } = context;
      const { total: parsedTotal } = parsedTable;

      const expression = getTotalExpression(tableName, fieldName, type);

      if (!parsedTotal || parsedTotal?.size === 0) {
        addTotalExpression(tableName, fieldName, indexOffset, expression);

        return;
      }

      const fieldTotal = parsedTotal.getFieldTotalTypes(fieldName);

      if (!fieldTotal.includes(type) || type === 'custom') {
        const totalRowIndex = findFirstEmptyTotalIndex(parsedTotal, fieldName);

        if (!totalRowIndex) return;

        addTotalExpression(tableName, fieldName, totalRowIndex, expression);

        return;
      }

      return removeTotalByType(tableName, fieldName, type);
    },
    [addTotalExpression, findEditContext, removeTotalByType]
  );

  const addAllFieldTotals = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context || !context.parsedField) return;

      const { sheet, parsedTable, parsedField, table } = context;
      const { total: parsedTotal } = parsedTable;
      const targetFieldName = parsedField.isDynamic
        ? dynamicFieldName
        : fieldName;

      const existingTotals = parsedTotal
        ? parsedTotal.getFieldTotalTypes(targetFieldName)
        : [];
      const tableData = viewGridData.getTableData(tableName);
      const fieldType = tableData.types[targetFieldName];

      if (!fieldType) return;

      const isNum = isNumericType(fieldType);
      const isText = fieldType === ColumnDataType.STRING;
      const isTable = isComplexType({
        type: fieldType,
        isNested: tableData.nestedColumnNames.has(targetFieldName),
      });

      const totalsToAdd: TotalType[] = [];

      if (isNum) {
        numTotals.forEach((totalType) => {
          if (!existingTotals.includes(totalType)) totalsToAdd.push(totalType);
        });
      }

      if (isText) {
        textTotals.forEach((totalType) => {
          if (!existingTotals.includes(totalType)) totalsToAdd.push(totalType);
        });
      }

      if (isTable) {
        tableTotals.forEach((totalType) => {
          if (!existingTotals.includes(totalType)) totalsToAdd.push(totalType);
        });
      }

      if (totalsToAdd.length === 0) return;

      const totalSize = parsedTotal?.size || 0;
      const fieldTotals = parsedTotal?.getFieldTotal(targetFieldName);

      for (let i = indexOffset; i <= totalSize; i++) {
        if (totalsToAdd.length === 0) break;

        if (!fieldTotals?.[i]) {
          const totalType = totalsToAdd.shift()!;
          const expression = getTotalExpression(
            tableName,
            targetFieldName,
            totalType
          );
          const targetTotal = table.getTotal(i);
          targetTotal.addField(fieldName, expression);
        }
      }

      while (totalsToAdd.length > 0) {
        const totalType = totalsToAdd.shift()!;
        const expression = getTotalExpression(
          tableName,
          targetFieldName,
          totalType
        );
        const total = new Total();
        total.addField(fieldName, expression);
        table.totals.append(total);
      }

      const historyTitle = `Add all totals to ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL, viewGridData]
  );

  return {
    addAllFieldTotals: useSafeCallback(addAllFieldTotals),
    addTotalExpression: useSafeCallback(addTotalExpression),
    editTotalExpression: useSafeCallback(editTotalExpression),
    removeTotalByIndex: useSafeCallback(removeTotalByIndex),
    removeTotalByType: useSafeCallback(removeTotalByType),
    toggleTotalByType: useSafeCallback(toggleTotalByType),
  };
}

function getTotalExpression(
  tableName: string,
  fieldName: string,
  type: TotalType
): string {
  if (type === 'custom') return naExpression;

  return `${type.toUpperCase()}(${tableName}[${fieldName}])`;
}
