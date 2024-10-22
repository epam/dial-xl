import { useCallback, useContext } from 'react';

import {
  applyKeyword,
  filterKeyword,
  naExpression,
  naValue,
  newLine,
  ParsedApply,
  SheetReader,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import { ParsedContext, useDSLUtils } from './useDSLUtils';

export function useApplyFilterManualEditDSL() {
  const { projectName } = useContext(ProjectContext);
  const { findContext, findNewApplyBlockOffset, updateDSL } = useDSLUtils();

  const insertNewApplyBlock = (
    sheetContent: string,
    offset: number,
    filterExpression: string
  ): string => {
    return (
      sheetContent.substring(0, offset + 1).trimEnd() +
      `${newLine}${applyKeyword}${newLine}${filterKeyword} ${filterExpression}${newLine}` +
      sheetContent.substring(offset + 1).trimStart()
    );
  };

  const insertNewFilterBlock = (
    sheetContent: string,
    offset: number,
    filterExpression: string
  ): string => {
    return (
      sheetContent.substring(0, offset + 1).trimEnd() +
      `${newLine}${filterKeyword} ${filterExpression}${newLine}` +
      sheetContent.substring(offset + 1).trimStart()
    );
  };

  const updateExistingFilterBlock = (
    sheetContent: string,
    start: number,
    end: number,
    filterExpressions: string[]
  ): string => {
    return (
      sheetContent.substring(0, start).trimEnd() +
      `${newLine}${filterKeyword} ${filterExpressions.join(
        ' AND '
      )}${newLine}` +
      sheetContent.substring(end + 1).trimStart()
    );
  };

  const cleanUpFilterBlock = (
    sheetContent: string,
    start: number,
    end: number,
    apply: ParsedApply
  ): string => {
    const canRemoveApplyBlock =
      !apply.sort || apply.sort.parsedExpression?.length === 0;

    if (canRemoveApplyBlock && apply.dslPlacement) {
      const { startOffset, stopOffset } = apply.dslPlacement;

      return (
        sheetContent.substring(0, startOffset) +
        sheetContent.substring(stopOffset + 1)
      );
    }

    return sheetContent.substring(0, start) + sheetContent.substring(end + 1);
  };

  const updateSheetContentForNumberFilter = useCallback(
    (
      context: ParsedContext,
      fieldName: string,
      operator: string,
      value: number | null
    ): string | null => {
      const { table, sheetContent } = context;
      const { apply } = table;
      const filterExpression = `[${fieldName}] ${operator} ${value}`;

      if (!apply) {
        const offset = findNewApplyBlockOffset(table.tableName);

        if (offset === null) return null;

        return insertNewApplyBlock(sheetContent, offset, filterExpression);
      } else if (!apply.filter && apply.dslPlacement) {
        const { stopOffset } = apply.dslPlacement;

        return insertNewFilterBlock(sheetContent, stopOffset, filterExpression);
      } else if (apply.filter && apply.filter.dslPlacement) {
        const { start, end } = apply.filter.dslPlacement;
        const filterExpressions = apply.filter.applyNumericFilter(
          fieldName,
          operator,
          value
        );

        if (filterExpressions.length > 0) {
          return updateExistingFilterBlock(
            sheetContent,
            start,
            end,
            filterExpressions
          );
        }

        return cleanUpFilterBlock(sheetContent, start, end, apply);
      }

      return null;
    },
    [findNewApplyBlockOffset]
  );

  const updateSheetContentForListFilter = useCallback(
    (
      context: ParsedContext,
      fieldName: string,
      values: string[],
      isNumeric: boolean
    ): string | null => {
      const { table, sheetContent } = context;
      const { apply } = table;
      const fieldFilterExpression = values
        .map((v) => `[${fieldName}] = ${getListFilterValue(isNumeric, v)}`)
        .join(' OR ');

      if (values.length === 0 && (!apply || !apply.filter)) return null;

      if (!apply) {
        const offset = findNewApplyBlockOffset(table.tableName);

        if (offset === null) return null;

        return insertNewApplyBlock(sheetContent, offset, fieldFilterExpression);
      } else if (!apply.filter && apply.dslPlacement) {
        const { stopOffset } = apply.dslPlacement;

        return insertNewFilterBlock(
          sheetContent,
          stopOffset,
          fieldFilterExpression
        );
      } else if (apply.filter && apply.filter.dslPlacement) {
        const { start, end } = apply.filter.dslPlacement;
        const existingFilterExpressions = apply.filter.getFilterExpressions({
          excludeFieldName: fieldName,
        });

        let combinedExpression = '';

        if (existingFilterExpressions.length > 0) {
          combinedExpression = `${existingFilterExpressions.join(' AND ')}`;

          if (values.length > 0) {
            combinedExpression += ' AND ';
            combinedExpression +=
              values.length > 1
                ? `(${fieldFilterExpression})`
                : fieldFilterExpression;
          }
        } else if (values.length > 0) {
          combinedExpression = fieldFilterExpression;
        }

        if (combinedExpression) {
          return updateExistingFilterBlock(sheetContent, start, end, [
            combinedExpression,
          ]);
        }

        return cleanUpFilterBlock(sheetContent, start, end, apply);
      }

      return null;
    },
    [findNewApplyBlockOffset]
  );

  const applyNumberFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      operator: string,
      value: number | null
    ) => {
      const context = findContext(tableName, fieldName);

      if (!projectName || !context) return;

      const updatedSheetContent = updateSheetContentForNumberFilter(
        context,
        fieldName,
        operator,
        value
      );
      if (!updatedSheetContent) return;

      const historyTitle =
        value !== null
          ? `Change filter of ${tableName}[${fieldName}] to ${operator} ${value}`
          : `Clear filter of the ${tableName}[${fieldName}]`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [findContext, projectName, updateDSL, updateSheetContentForNumberFilter]
  );

  const applyListFilter = useCallback(
    (
      tableName: string,
      fieldName: string,
      values: string[],
      isNumeric: boolean
    ) => {
      const context = findContext(tableName, fieldName);

      if (!projectName || !context) return;

      const updatedSheetContent = updateSheetContentForListFilter(
        context,
        fieldName,
        values,
        isNumeric
      );

      if (!updatedSheetContent) return;

      const historyTitle =
        values.length > 0
          ? `Change filter of ${tableName}[${fieldName}] to ${values}`
          : `Clear filter of the ${tableName}[${fieldName}]`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [findContext, projectName, updateDSL, updateSheetContentForListFilter]
  );

  const renameFilterField = useCallback(
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

        const { apply } = table;
        const isFieldFiltered = apply?.filter?.hasFieldFilter(fieldName);

        if (!isFieldFiltered || !apply?.filter || !apply.filter.dslPlacement)
          return sheetContent;

        const { start, end } = apply.filter.dslPlacement;
        const existingFilterExpressions = apply.filter.getFilterExpressions({
          oldFieldName: fieldName,
          newFieldName,
        });
        const combinedExpression = `${existingFilterExpressions.join(' AND ')}`;

        return combinedExpression
          ? updateExistingFilterBlock(sheetContent, start, end, [
              combinedExpression,
            ])
          : sheetContent;
      } catch (e) {
        return sheetContent;
      }
    },
    []
  );

  const removeFilterField = useCallback(
    (tableName: string, fieldName: string, sheetContent: string) => {
      try {
        const parsedSheet = SheetReader.parseSheet(sheetContent);
        const table = parsedSheet.tables.find((t) => t.tableName === tableName);

        if (!table || !table?.apply?.filter) return sheetContent;

        const { filter } = table.apply;

        if (!filter.hasFieldFilter(fieldName) || !filter.dslPlacement)
          return sheetContent;

        const { start, end } = filter.dslPlacement;
        const filterExpressions = filter.getFilterExpressions({
          excludeFieldName: fieldName,
        });
        const combinedExpression =
          filterExpressions.length > 0 ? filterExpressions.join(' AND ') : '';

        if (combinedExpression) {
          return updateExistingFilterBlock(sheetContent, start, end, [
            combinedExpression,
          ]);
        }

        return cleanUpFilterBlock(sheetContent, start, end, table.apply);
      } catch (error) {
        return sheetContent;
      }
    },
    []
  );

  return {
    applyNumberFilter,
    applyListFilter,
    renameFilterField,
    removeFilterField,
  };
}

function getListFilterValue(isNumeric: boolean, value: string) {
  if (value === naValue) return naExpression;

  return isNumeric ? value : `"${value}"`;
}
