import { useCallback, useContext } from 'react';

import {
  errorFunction,
  newLine,
  overrideKeyword,
  OverrideValue,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import { addOverridesToSheet } from '../../utils';
import { useGridApi } from '../useGridApi';
import { useRequestDimTable } from '../useRequestDimTable';
import { useDSLUtils } from './useDSLUtils';
import { useManualDeleteTableDSL } from './useManualDeleteTableDSL';

export const removeOverrideDSL = (
  table: ParsedTable,
  fieldName: string,
  overrideIndex: number,
  value: OverrideValue,
  inputSheetContent: string
) => {
  if (!table?.dslOverridePlacement || !table?.overrides) return;

  const { overrides, dslOverridePlacement, dslPlacement } = table;
  const { startOffset, stopOffset } = dslOverridePlacement;
  overrides.updateFieldValueByIndex(fieldName, overrideIndex, null);
  const updatedOverride = overrides.convertToDsl();
  const overrideDsl = updatedOverride
    ? `${overrideKeyword}${newLine}${updatedOverride}${newLine}${newLine}`
    : '';

  if (!overrideDsl && table.isManual() && dslPlacement) {
    const { startOffset, stopOffset } = dslPlacement;

    const updatedSheetContent =
      inputSheetContent.substring(0, startOffset) +
      inputSheetContent.substring(stopOffset + 1).replace(newLine, '');

    const historyTitle = `Delete table "${table.tableName}"`;

    return { updatedSheetContent, historyTitle, tableRemoved: true };
  }

  const updatedSheetContent =
    inputSheetContent.substring(0, startOffset) +
    overrideDsl +
    inputSheetContent.substring(stopOffset + 1);

  const historyTitle = `Remove override ${value} from table "${table.tableName}"`;

  return {
    updatedSheetContent,
    historyTitle,
    tableRemoved: false,
  };
};

function removeFieldOverride(
  tableName: string,
  fieldName: string,
  sheetContent: string
): string {
  try {
    const parsedSheet = SheetReader.parseSheet(sheetContent);
    const table = parsedSheet.tables.find((t) => t.tableName === tableName);

    if (!table || !table.overrides || !table.dslOverridePlacement)
      return sheetContent;

    const { overrides, dslOverridePlacement } = table;
    const { startOffset, stopOffset } = dslOverridePlacement;
    overrides.removeField(fieldName);
    const updatedOverride = overrides.convertToDsl();
    const overrideDsl = updatedOverride
      ? `${newLine}${overrideKeyword}${newLine}${updatedOverride}${newLine}`
      : newLine;

    const updatedSheetContent =
      sheetContent.substring(0, startOffset).trimEnd() +
      overrideDsl +
      sheetContent.substring(stopOffset + 1).trimStart();

    return updatedSheetContent;
  } catch (error) {
    return sheetContent;
  }
}

export function useOverridesManualEditDSL() {
  const { sheetContent, projectName } = useContext(ProjectContext);
  const { updateDSL, findTable } = useDSLUtils();
  const gridApi = useGridApi();
  const { createDimTableFromFormula } = useRequestDimTable();
  const { deleteTable } = useManualDeleteTableDSL();

  const removeOverride = useCallback(
    (
      tableName: string,
      fieldName: string,
      overrideIndex: number,
      value: OverrideValue
    ) => {
      if (!projectName) return;

      const table = findTable(tableName);

      if (!table || !sheetContent) return;

      const result = removeOverrideDSL(
        table,
        fieldName,
        overrideIndex,
        value,
        sheetContent
      );

      if (result) {
        updateDSL(result.updatedSheetContent, result.historyTitle);
      }
    },
    [findTable, projectName, sheetContent, updateDSL]
  );

  const removeOverrideRow = useCallback(
    (tableName: string, overrideIndex: number) => {
      if (!projectName) return;

      const table = findTable(tableName);

      if (
        !table ||
        !table.dslOverridePlacement ||
        !sheetContent ||
        !table.overrides
      )
        return;

      const { overrides, dslOverridePlacement } = table;
      overrides?.removeRow(overrideIndex);

      const updatedSheetContent =
        sheetContent.slice(0, dslOverridePlacement.startOffset) +
        overrideKeyword +
        newLine +
        overrides.convertToDsl() +
        sheetContent.slice(dslOverridePlacement.stopOffset);

      updateDSL(
        updatedSheetContent,
        `Remove override row from table "${tableName}"`
      );
    },
    [findTable, projectName, sheetContent, updateDSL]
  );

  const editOverride = useCallback(
    (
      tableName: string,
      fieldName: string,
      overrideIndex: number,
      value: string
    ) => {
      if (!projectName) return;

      const table = findTable(tableName);

      if (!table?.dslOverridePlacement || !table?.overrides || !sheetContent)
        return;

      const { overrides, dslOverridePlacement, fields } = table;
      const currentOverride = overrides.getValueAtIndex(
        fieldName,
        overrideIndex
      );
      const currentValueWrapped = currentOverride
        ?.toString()
        .startsWith(`${errorFunction}("`);
      const updatedValueWrapped = value.startsWith(`${errorFunction}("`);

      // If fixed override expression wrapped in ERR() function in a manual table with a single field
      // try to make dimensional request with fixed formula and remove current table
      if (
        currentValueWrapped &&
        !updatedValueWrapped &&
        table.isManual() &&
        fields.length === 1 &&
        overrides?.overrideRows?.length === 1
      ) {
        const [row, col] = table.getPlacement();
        deleteTable(tableName);
        createDimTableFromFormula(col, row, `=${value}`);

        return;
      }

      const { startOffset, stopOffset } = dslOverridePlacement;
      overrides.updateFieldValueByIndex(fieldName, overrideIndex, value);
      const updatedOverride = overrides.convertToDsl();

      const updatedSheetContent =
        sheetContent.substring(0, startOffset) +
        `${overrideKeyword}${newLine}${updatedOverride}${newLine}${newLine}` +
        sheetContent.substring(stopOffset + 1);

      const historyTitle = `Edit override ${value} in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      projectName,
      findTable,
      sheetContent,
      updateDSL,
      createDimTableFromFormula,
      deleteTable,
    ]
  );

  const renameOverrideField = useCallback(
    (tableName: string, oldFieldName: string, newFieldName: string) => {
      const targetTable = findTable(tableName);

      if (
        !targetTable?.dslOverridePlacement ||
        !targetTable?.overrides ||
        !sheetContent
      )
        return '';

      const { overrides, dslOverridePlacement } = targetTable;
      const { startOffset, stopOffset } = dslOverridePlacement;
      overrides?.renameField(oldFieldName, newFieldName);
      const updatedOverride = overrides.convertToDsl();

      return (
        sheetContent.substring(0, startOffset) +
        `${overrideKeyword}${newLine}${updatedOverride}${newLine}${newLine}${newLine}` +
        sheetContent.substring(stopOffset + 1)
      );
    },
    [findTable, sheetContent]
  );

  const addOverrides = useCallback(
    (
      selectedCol: number,
      selectedRow: number,
      tableName: string,
      cells: string[][],
      withShifting?: boolean
    ) => {
      const table = findTable(tableName);
      if (!projectName || !table || !sheetContent) return;

      const updatedSheetContent = addOverridesToSheet({
        table,
        cells,
        gridApi,
        selectedCol,
        selectedRow,
        sheetContent,
        withShifting,
      });

      if (!updatedSheetContent) {
        return;
      }

      let historyTitle = `Add multiple overrides to table "${table.tableName}"`;

      if (cells.length === 1 && cells[0].length === 1) {
        historyTitle = `Add override "${cells[0][0]}" to table "${table.tableName}"`;
      }

      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, findTable, gridApi, sheetContent, updateDSL]
  );

  const addOverride = useCallback(
    (
      col: number,
      row: number,
      tableName: string,
      value: string,
      withShifting?: boolean
    ) => {
      addOverrides(col, row, tableName, [[value]], withShifting);
    },
    [addOverrides]
  );

  return {
    addOverrides,
    addOverride,
    editOverride,
    removeOverride,
    renameOverrideField,
    removeOverrideRow,
    // Functions which just returns updated sheet content
    removeOverrideDSL,
    removeFieldOverride,
  };
}
