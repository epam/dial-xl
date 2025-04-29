import { useCallback, useContext } from 'react';

import { ColumnDataType, isComplexType, isNumericType } from '@frontend/common';
import {
  dynamicFieldName,
  Field,
  naExpression,
  Total,
  TotalType,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { autoFixSingleExpression } from '../../services';
import { useDSLUtils } from '../ManualEditDSL';
import { useSafeCallback } from '../useSafeCallback';
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

      if (!total || total?.size === 0 || !table.totalCount) return;

      const fieldTotals = total.getFieldTotal(fieldName);

      if (!fieldTotals || !fieldTotals[index]) return;

      const targetTotal = table.getTotal(index);
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

      if (!total || total?.size === 0 || !table.totalCount) return;

      const fieldTotals = total.getFieldTotal(fieldName);

      if (!fieldTotals) return;

      for (const [rowStr, fieldTotal] of Object.entries(fieldTotals)) {
        if (fieldTotal.type === type) {
          const row = Number(rowStr);
          const targetTotal = table.getTotal(row);
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
      const newTotalField = new Field(fieldName, fixedExpression);

      if (!parsedTotal || parsedTotal?.size === 0 || !table.totalCount) {
        const total = new Total();
        total.addField(newTotalField);
        table.addTotal(total);
      } else {
        const fieldTotals = parsedTotal.getTotalByIndex(index);
        if (fieldTotals.length === 0) {
          const total = new Total();
          total.addField(newTotalField);
          table.addTotal(total);
        } else {
          const targetTotal = table.getTotal(index);
          targetTotal.addField(newTotalField);
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

      if (!parsedTotal || parsedTotal?.size === 0 || !table.totalCount) return;

      const fieldTotals = parsedTotal.getFieldTotal(fieldName);

      if (!fieldTotals || !fieldTotals[index]) return;

      const fixedExpression = autoFixSingleExpression(
        expression,
        functions,
        parsedSheets,
        tableName
      );

      const targetTotal = table.getTotal(index).getField(fieldName);
      targetTotal.formula = fixedExpression;

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

      const { parsedTable, parsedField } = context;
      const { total: parsedTotal } = parsedTable;

      const targetFieldName = parsedField.isDynamic
        ? dynamicFieldName
        : fieldName;
      const expression = getTotalExpression(tableName, targetFieldName, type);

      if (!parsedTotal || parsedTotal?.size === 0) {
        addTotalExpression(tableName, targetFieldName, 1, expression);

        return;
      }

      const fieldTotal = parsedTotal.getFieldTotalTypes(targetFieldName);

      if (!fieldTotal.includes(type) || type === 'custom') {
        const totalRowIndex = findFirstEmptyTotalIndex(
          parsedTotal,
          targetFieldName
        );

        if (!totalRowIndex) return;

        addTotalExpression(
          tableName,
          targetFieldName,
          totalRowIndex,
          expression
        );

        return;
      }

      return removeTotalByType(tableName, targetFieldName, type);
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

      for (let i = 1; i <= totalSize; i++) {
        if (totalsToAdd.length === 0) break;

        if (!fieldTotals?.[i]) {
          const totalType = totalsToAdd.shift()!;
          const expression = getTotalExpression(
            tableName,
            targetFieldName,
            totalType
          );
          const targetTotal = table.getTotal(i);
          targetTotal.addField(new Field(fieldName, expression));
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
        total.addField(new Field(fieldName, expression));

        table.addTotal(total);
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
