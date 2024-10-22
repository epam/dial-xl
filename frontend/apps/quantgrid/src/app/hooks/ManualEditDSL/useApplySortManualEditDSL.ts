import { useCallback, useContext } from 'react';

import { FieldSortOrder } from '@frontend/common';
import {
  applyKeyword,
  newLine,
  ParsedApply,
  SheetReader,
  sortKeyword,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import { ParsedContext, useDSLUtils } from './useDSLUtils';

export function useApplySortManualEditDSL() {
  const { projectName } = useContext(ProjectContext);
  const { findContext, findNewApplyBlockOffset, updateDSL } = useDSLUtils();

  const insertNewApplyBlock = (
    sheetContent: string,
    offset: number,
    sortSign: string,
    fieldName: string
  ): string => {
    return (
      sheetContent.substring(0, offset + 1).trimEnd() +
      `${newLine}${applyKeyword}${newLine}${sortKeyword} ${sortSign}[${fieldName}]${newLine}` +
      sheetContent.substring(offset + 1).trimStart()
    );
  };

  const insertNewSortBlock = (
    sheetContent: string,
    offset: number,
    sortSign: string,
    fieldName: string
  ): string => {
    return (
      sheetContent.substring(0, offset + 1).trimEnd() +
      `${newLine}${sortKeyword} ${sortSign}[${fieldName}]${newLine}` +
      sheetContent.substring(offset + 1).trimStart()
    );
  };

  const updateExistingSortBlock = (
    sheetContent: string,
    start: number,
    end: number,
    sortExpressions: string[]
  ): string => {
    return (
      sheetContent.substring(0, start).trimEnd() +
      `${newLine}${sortKeyword} ${sortExpressions.join(',')}${newLine}` +
      sheetContent.substring(end + 1).trimStart()
    );
  };

  const cleanUpSortBlock = (
    sheetContent: string,
    start: number,
    end: number,
    apply: ParsedApply
  ): string => {
    const canClearEntireApplyBlock =
      !apply.filter || apply.filter.getFilterExpressions({}).length === 0;

    if (canClearEntireApplyBlock && apply.dslPlacement) {
      const { startOffset, stopOffset } = apply.dslPlacement;

      return (
        sheetContent.substring(0, startOffset) +
        sheetContent.substring(stopOffset + 1)
      );
    }

    return sheetContent.substring(0, start) + sheetContent.substring(end + 1);
  };

  const updateSheetContent = useCallback(
    (
      context: ParsedContext,
      sortOrder: FieldSortOrder,
      fieldName: string
    ): string | null => {
      const { table, sheetContent } = context;
      const { apply } = table;
      const sortSign = sortOrder === 'desc' ? '-' : '';

      if (!apply) {
        const offset = findNewApplyBlockOffset(table.tableName);

        return offset !== null
          ? insertNewApplyBlock(sheetContent, offset, sortSign, fieldName)
          : null;
      } else if (!apply.sort && apply.dslPlacement) {
        const { stopOffset } = apply.dslPlacement;

        return insertNewSortBlock(
          sheetContent,
          stopOffset,
          sortSign,
          fieldName
        );
      } else if (apply.sort && apply.sort.dslPlacement) {
        const { start, end } = apply.sort.dslPlacement;
        const sortExpressions = apply.sort.getChangedFieldSort(
          fieldName,
          sortOrder
        );

        return sortExpressions.length > 0
          ? updateExistingSortBlock(sheetContent, start, end, sortExpressions)
          : cleanUpSortBlock(sheetContent, start, end, apply);
      }

      return null;
    },
    [findNewApplyBlockOffset]
  );

  const changeFieldSort = useCallback(
    (tableName: string, fieldName: string, sortOrder: FieldSortOrder) => {
      const context = findContext(tableName, fieldName);

      if (!projectName || !context) return;

      const updatedSheetContent = updateSheetContent(
        context,
        sortOrder,
        fieldName
      );
      if (!updatedSheetContent) return;

      const historyTitle = sortOrder
        ? `Change sort order of ${tableName}[${fieldName}] to ${sortOrder}"`
        : `Clear sort of the ${tableName}[${fieldName}]`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [findContext, projectName, updateDSL, updateSheetContent]
  );

  const renameSortField = useCallback(
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
        const fieldSortOrder = apply?.sort?.getFieldSortOrder(fieldName);

        if (!fieldSortOrder || !apply?.sort || !apply.sort.dslPlacement)
          return sheetContent;

        const { start, end } = apply.sort.dslPlacement;
        const sortExpressions = apply.sort.getChangedFieldSort(
          fieldName,
          fieldSortOrder,
          newFieldName
        );

        return sortExpressions.length > 0
          ? updateExistingSortBlock(sheetContent, start, end, sortExpressions)
          : sheetContent;
      } catch (e) {
        return sheetContent;
      }
    },
    []
  );

  const removeSortField = useCallback(
    (tableName: string, fieldName: string, sheetContent: string) => {
      try {
        const parsedSheet = SheetReader.parseSheet(sheetContent);
        const table = parsedSheet.tables.find((t) => t.tableName === tableName);

        if (!table || !table?.apply?.sort) return sheetContent;

        const { sort } = table.apply;
        const fieldSortOrder = sort.getFieldSortOrder(fieldName);

        if (!fieldSortOrder || !sort.dslPlacement) return sheetContent;

        const { start, end } = sort.dslPlacement;
        const sortExpressions = sort.getChangedFieldSort(fieldName, null);

        return sortExpressions.length > 0
          ? updateExistingSortBlock(sheetContent, start, end, sortExpressions)
          : cleanUpSortBlock(sheetContent, start, end, table.apply);
      } catch (error) {
        return sheetContent;
      }
    },
    []
  );

  return {
    changeFieldSort,
    renameSortField,
    removeSortField,
  };
}
