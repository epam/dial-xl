import { useCallback, useContext } from 'react';

import { defaultRowKey, newLine, ParsedOverride } from '@frontend/parser';

import {
  ProjectContext,
  SpreadsheetContext,
  UndoRedoContext,
} from '../context';
import { useDSLUtils } from './useDSLUtils';

export function useOverridesManualEditDSL() {
  const { sheetContent } = useContext(ProjectContext);
  const { updateDSL, findTable } = useDSLUtils();
  const { gridService } = useContext(SpreadsheetContext);
  const { append } = useContext(UndoRedoContext);

  const removeOverride = useCallback(
    (
      tableName: string,
      fieldName: string,
      overrideIndex: number,
      value: string
    ) => {
      const table = findTable(tableName);

      if (!table?.dslOverridePlacement || !table?.overrides || !sheetContent)
        return;

      const { overrides, dslOverridePlacement } = table;
      const { start, end } = dslOverridePlacement;
      overrides.updateFieldValueByIndex(fieldName, overrideIndex, null);
      const updatedOverride = overrides.convertToDsl();
      const overrideDsl = updatedOverride
        ? `override${newLine}${updatedOverride}${newLine}${newLine}`
        : '';

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        overrideDsl +
        sheetContent.substring(end + 1);

      updateDSL(updatedSheetContent);

      append(
        `Remove override ${value} from table "${tableName}"`,
        updatedSheetContent
      );
    },
    [append, findTable, sheetContent, updateDSL]
  );

  const editOverride = useCallback(
    (
      tableName: string,
      fieldName: string,
      overrideIndex: number,
      value: string
    ) => {
      const table = findTable(tableName);

      if (!table?.dslOverridePlacement || !table?.overrides || !sheetContent)
        return;

      const { overrides, dslOverridePlacement } = table;
      const { start, end } = dslOverridePlacement;
      overrides.updateFieldValueByIndex(fieldName, overrideIndex, value);
      const updatedOverride = overrides.convertToDsl();

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        `override${newLine}${updatedOverride}${newLine}` +
        sheetContent.substring(end + 1);

      updateDSL(updatedSheetContent);

      append(
        `Edit override ${value} in table "${tableName}"`,
        updatedSheetContent
      );
    },
    [append, findTable, sheetContent, updateDSL]
  );

  const addOverride = useCallback(
    (tableName: string, fieldName: string, tableRow: number, value: string) => {
      const table = findTable(tableName);

      if (!table || !sheetContent || !table.dslPlacement) return;

      if (!table.overrides) {
        table.overrides = new ParsedOverride('');
        const keys = table.fields
          .filter((f) => f.isKey)
          .map((f) => f.key.fieldName);
        table.overrides.keys = new Set(keys);
      }

      const { overrides, dslPlacement, dslOverridePlacement } = table;

      if (table.isManual()) {
        overrides?.setFieldValueByIndex(fieldName, tableRow, value);
      } else if (table.hasKeys()) {
        const [startRow, startCol] = table.getPlacement();
        const sheetRow = tableRow + startRow + 2;
        const keys: Record<string, string> = {};

        overrides.keys.forEach((key) => {
          const tableFieldIndex = table.fields.findIndex(
            (f) => f.key.fieldName === key
          );
          const sheetCol = tableFieldIndex + startCol;
          const cell = gridService?.getCellValue(sheetRow, sheetCol);
          key && cell?.value && (keys[key] = cell.value);
        });

        overrides.setValueByKeys(keys, fieldName, value);
      } else {
        overrides.setFieldValueByKey(
          defaultRowKey,
          tableRow + 1,
          fieldName,
          value
        );
      }

      let start = 0;
      let end = 0;
      const { stopOffset } = dslPlacement;

      if (dslOverridePlacement) {
        start = dslOverridePlacement.start;
        end = dslOverridePlacement.end;
      } else {
        start = end = stopOffset + 1;
      }

      const updatedOverride = overrides?.convertToDsl();
      const updatedSheetContent =
        sheetContent.substring(0, start).trimEnd() +
        `${newLine}override${newLine}${updatedOverride}${newLine}${newLine}` +
        sheetContent.substring(end + 1);

      updateDSL(updatedSheetContent);

      append(
        `Add override ${value} to table "${tableName}"`,
        updatedSheetContent
      );
    },
    [append, findTable, gridService, sheetContent, updateDSL]
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
      const { start, end } = dslOverridePlacement;
      overrides?.renameField(oldFieldName, newFieldName);
      const updatedOverride = overrides.convertToDsl();

      return (
        sheetContent.substring(0, start) +
        `override${newLine}${updatedOverride}${newLine}${newLine}${newLine}` +
        sheetContent.substring(end + 1)
      );
    },
    [findTable, sheetContent]
  );

  return {
    addOverride,
    editOverride,
    removeOverride,
    renameOverrideField,
  };
}
