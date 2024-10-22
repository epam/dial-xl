import { useCallback, useContext } from 'react';

import {
  dynamicFieldName,
  findFieldNameInExpression,
  naExpression,
  newLine,
  ParsedTable,
  ParsedTotal,
  SheetReader,
  ShortDSLPlacement,
  totalKeyword,
  TotalType,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import { autoFixSingleExpression } from '../../services';
import { useDSLUtils } from './useDSLUtils';

export function useTotalManualEditDSL() {
  const { projectName, functions, parsedSheets } = useContext(ProjectContext);
  const { findContext, findNewTotalSectionOffset, updateDSL } = useDSLUtils();

  const removeTotalByField = useCallback(
    (tableName: string, fieldName: string, sheetContent: string): string => {
      try {
        const parsedSheet = SheetReader.parseSheet(sheetContent);
        const table = parsedSheet.tables.find((t) => t.tableName === tableName);
        const itemsToRemove = getTotalsToRemove(fieldName, table);

        return removeTotalItems(sheetContent, itemsToRemove);
      } catch (e) {
        return sheetContent;
      }
    },
    []
  );

  const removeTotalByType = useCallback(
    (tableName: string, fieldName: string, type: TotalType) => {
      const context = findContext(tableName, fieldName);
      if (!context || !projectName) return;

      const itemsToRemove = getTotalsToRemove(fieldName, context.table, type);

      if (!itemsToRemove.length) return;

      const updatedSheetContent = removeTotalItems(
        context.sheetContent,
        itemsToRemove
      );
      const historyTitle = `Remove total ${type.toUpperCase()} from ${tableName}[${fieldName}]`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [findContext, projectName, updateDSL]
  );

  const removeTotalByIndex = useCallback(
    (tableName: string, fieldName: string, index: number) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { table, sheetContent } = context;
      const { total } = table;

      if (!total || total?.size === 0) return;

      const fieldTotals = total.getFieldTotal(fieldName);

      if (!fieldTotals || !fieldTotals[index]) return;

      const {
        fieldNameDslPlacement,
        expressionDslPlacement,
        totalDslPlacement,
      } = fieldTotals[index];

      if (
        !fieldNameDslPlacement ||
        !expressionDslPlacement ||
        !totalDslPlacement
      )
        return;

      const totalRow = total.getTotalByIndex(index);
      const startOffset =
        totalRow.length === 1
          ? totalDslPlacement.start
          : fieldNameDslPlacement.start;
      const endOffset =
        totalRow.length === 1
          ? totalDslPlacement.end + 1
          : expressionDslPlacement.end + 1;

      const dsl =
        sheetContent.substring(0, startOffset).trimEnd() +
        newLine +
        sheetContent.substring(endOffset).trimStart();

      const historyTitle = `Remove total ${index} from ${tableName}[${fieldName}]`;
      updateDSL(dsl, historyTitle);
    },
    [findContext, projectName, updateDSL]
  );

  const addTotalExpression = useCallback(
    (
      tableName: string,
      fieldName: string,
      index: number,
      expression: string
    ) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { table, sheetContent } = context;
      const { total } = table;

      if (!total || total?.size === 0) return;

      const fieldTotals = total.getTotalByIndex(index);

      if (fieldTotals.length === 0) return;

      const firstTotalItem = fieldTotals[0];

      if (!firstTotalItem.totalDslPlacement) return;

      const { totalDslPlacement } = firstTotalItem;

      const fixedExpression = autoFixSingleExpression(
        expression,
        functions,
        parsedSheets,
        tableName
      );

      const dsl =
        sheetContent.substring(0, totalDslPlacement.end).trimEnd() +
        newLine +
        `[${fieldName}] = ${fixedExpression
          .trimStart()
          .replace('=', '')
          .trimStart()}` +
        newLine +
        sheetContent.substring(totalDslPlacement.end + 1).trimStart();

      const historyTitle = `Add total formula for the ${tableName}[${fieldName}]`;
      updateDSL(dsl, historyTitle);
    },
    [findContext, functions, parsedSheets, projectName, updateDSL]
  );

  const editTotalExpression = useCallback(
    (
      tableName: string,
      fieldName: string,
      index: number,
      expression: string
    ) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { table, sheetContent } = context;
      const { total } = table;

      if (!total || total?.size === 0) return;

      const fieldTotals = total.getFieldTotal(fieldName);

      if (!fieldTotals || !fieldTotals[index]) return;

      const { expressionDslPlacement } = fieldTotals[index];

      if (!expressionDslPlacement) return;

      const fixedExpression = autoFixSingleExpression(
        expression,
        functions,
        parsedSheets,
        tableName
      );

      const dsl =
        sheetContent.substring(0, expressionDslPlacement.start) +
        fixedExpression.trimStart().replace('=', '').trimStart() +
        sheetContent.substring(expressionDslPlacement.end + 1);

      const historyTitle = `Edit total formula for the ${tableName}[${fieldName}]`;
      updateDSL(dsl, historyTitle);
    },
    [findContext, functions, parsedSheets, projectName, updateDSL]
  );

  const renameTotalField = useCallback(
    (
      tableName: string,
      fieldName: string,
      newFieldName: string,
      sheetContent: string
    ): string => {
      try {
        const parsedSheet = SheetReader.parseSheet(sheetContent);
        const table = parsedSheet.tables.find((t) => t.tableName === tableName);

        if (!table) return sheetContent;

        const { total } = table;

        if (!total || total?.size === 0) return sheetContent;

        const fieldTotal = total.getFieldTotal(fieldName);

        if (!fieldTotal) return sheetContent;

        let updatedSheetContent = sheetContent;
        const reversedTotalIndexes = Object.keys(fieldTotal).sort(
          (a, b) => parseInt(b) - parseInt(a)
        );

        for (const index of reversedTotalIndexes) {
          const rowIndex = parseInt(index);
          const totalItem = fieldTotal[rowIndex];
          const { fieldNameDslPlacement, expressionDslPlacement, expression } =
            totalItem;

          if (!fieldNameDslPlacement || !expressionDslPlacement) continue;

          try {
            const parsedExpression = SheetReader.parseFormula(expression);
            const expressionFields = findFieldNameInExpression(parsedExpression)
              .filter(
                (i) =>
                  i.tableName === tableName && i.fieldName === `[${fieldName}]`
              )
              .sort((a, b) => b.start - a.start);

            let updatedExpression = expression;

            for (const field of expressionFields) {
              const { start, end } = field;

              updatedExpression =
                updatedExpression.substring(0, start) +
                `[${newFieldName}]` +
                updatedExpression.substring(end + 1);
            }

            updatedSheetContent =
              updatedSheetContent.substring(0, expressionDslPlacement.start) +
              updatedExpression +
              updatedSheetContent.substring(expressionDslPlacement.end + 1);
          } catch (e) {
            // empty block
          }

          updatedSheetContent =
            updatedSheetContent.substring(0, fieldNameDslPlacement.start) +
            `[${newFieldName}]` +
            updatedSheetContent.substring(fieldNameDslPlacement.end);
        }

        return updatedSheetContent;
      } catch (e) {
        return sheetContent;
      }
    },
    []
  );

  const toggleTotalByType = useCallback(
    (tableName: string, fieldName: string, type: TotalType) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { table, sheetContent, field } = context;
      const { total } = table;

      const targetFieldName =
        !field || field?.isDynamic ? dynamicFieldName : fieldName;
      const totalSectionExpression = geTotalSectionExpression(
        tableName,
        targetFieldName,
        type
      );
      const expression = getTotalExpression(tableName, targetFieldName, type);
      const historyTitle = `Add total ${type.toUpperCase()} to ${tableName}[${targetFieldName}]`;

      if (!total || total?.size === 0) {
        const offset = findNewTotalSectionOffset(table);

        if (!offset) return;

        const dsl = insertTotal(sheetContent, offset, totalSectionExpression);
        updateDSL(dsl, historyTitle);

        return;
      }

      const fieldTotal = total.getFieldTotalTypes(targetFieldName);

      if (!fieldTotal.includes(type) || type === 'custom') {
        const emptyTotalSection = findTargetTotalPlacement(
          total,
          targetFieldName
        );

        if (!emptyTotalSection) return;

        const { offset, newTotalRequired } = emptyTotalSection;
        const exp = newTotalRequired ? totalSectionExpression : expression;
        const dsl = insertTotal(sheetContent, offset, exp);

        updateDSL(dsl, historyTitle);

        return;
      }

      return removeTotalByType(tableName, targetFieldName, type);
    },
    [
      findContext,
      findNewTotalSectionOffset,
      projectName,
      removeTotalByType,
      updateDSL,
    ]
  );

  return {
    removeTotalByField,
    removeTotalByType,
    removeTotalByIndex,
    toggleTotalByType,
    addTotalExpression,
    editTotalExpression,
    renameTotalField,
  };
}

function findTargetTotalPlacement(
  total: ParsedTotal,
  fieldName: string
): { offset: number; newTotalRequired: boolean } | null {
  const totalSize = total.size;
  const fieldTotals = total.getFieldTotal(fieldName);

  // No totals for source field yet => get existing first total row
  if (!fieldTotals) {
    const firstTotalRow = total.getTotalByIndex(1);

    if (firstTotalRow.length === 0) return null;
    const offset = firstTotalRow[0].totalDslPlacement?.end;

    return offset ? { offset, newTotalRequired: false } : null;
  }

  const fieldTotalKeys = Object.keys(fieldTotals);
  const existingIndexes = fieldTotalKeys.sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  // Search for empty placement in the existing rows
  for (let i = 1; i <= totalSize; i++) {
    if (!existingIndexes.includes(i.toString())) {
      const targetTotalRow = total.getTotalByIndex(i);

      if (targetTotalRow.length === 0) return null;
      const offset = targetTotalRow[0].totalDslPlacement?.end;

      return offset ? { offset, newTotalRequired: false } : null;
    }
  }

  // No placement found => create new total row
  const offset = total.dslPlacement?.stopOffset;

  return offset ? { offset, newTotalRequired: true } : null;
}

function insertTotal(
  sheetContent: string,
  offset: number,
  expression: string
): string {
  return (
    sheetContent.substring(0, offset + 1).trimEnd() +
    `${newLine}${expression}` +
    sheetContent.substring(offset + 1).trimStart()
  );
}

function geTotalSectionExpression(
  tableName: string,
  fieldName: string,
  type: TotalType
): string {
  return `${totalKeyword}${newLine}${getTotalExpression(
    tableName,
    fieldName,
    type
  )}`;
}

function getTotalExpression(
  tableName: string,
  fieldName: string,
  type: TotalType
): string {
  if (type === 'custom') return `[${fieldName}] = ${naExpression}${newLine}`;

  return `[${fieldName}] = ${type.toUpperCase()}(${tableName}[${fieldName}])${newLine}`;
}

function getTotalsToRemove(
  fieldName: string,
  table?: ParsedTable,
  filterType?: TotalType
): ShortDSLPlacement[] {
  if (!table || !table.total || table.getTotalSize() === 0) return [];

  const fieldTotals = table.total.getFieldTotal(fieldName);
  if (!fieldTotals) return [];

  const itemsToRemove: ShortDSLPlacement[] = [];
  for (const index of Object.keys(fieldTotals)) {
    const rowIndex = parseInt(index);
    const totalItem = fieldTotals[rowIndex];
    const { fieldNameDslPlacement, expressionDslPlacement } = totalItem;

    if (filterType && totalItem.type !== filterType) continue;

    const totalRow = table.total.getTotalByIndex(rowIndex);
    if (totalRow.length === 1 && totalRow[0].totalDslPlacement) {
      itemsToRemove.push(totalRow[0].totalDslPlacement);
    } else if (fieldNameDslPlacement && expressionDslPlacement) {
      itemsToRemove.push({
        start: fieldNameDslPlacement.start,
        end: expressionDslPlacement.end,
      });
    }
  }

  return itemsToRemove;
}

function removeTotalItems(
  sheetContent: string,
  items: ShortDSLPlacement[]
): string {
  if (items.length === 0) return sheetContent;

  items.sort((a, b) => b.start - a.start);

  let updatedSheetContent = sheetContent;

  items.forEach((i) => {
    updatedSheetContent =
      updatedSheetContent.substring(0, i.start).trimEnd() +
      newLine +
      updatedSheetContent.substring(i.end + 1).trimStart();
  });

  return updatedSheetContent;
}
