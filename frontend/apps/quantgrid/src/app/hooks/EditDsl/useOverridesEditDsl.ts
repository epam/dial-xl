import { useCallback } from 'react';

import { errorFunction, OverrideValue } from '@frontend/parser';

import { useDSLUtils } from '../ManualEditDSL';
import { useGridApi } from '../useGridApi';
import { useRequestDimTable } from '../useRequestDimTable';
import { useSafeCallback } from '../useSafeCallback';
import { useTableEditDsl } from './useTableEditDsl';
import { addOverridesToTable } from './utils';

export function useOverridesEditDsl() {
  const { updateDSL, findEditContext } = useDSLUtils();
  const { deleteTable } = useTableEditDsl();
  const { createDimTableFromFormula } = useRequestDimTable();
  const gridApi = useGridApi();

  const removeOverride = useCallback(
    (
      tableName: string,
      fieldName: string,
      overrideIndex: number,
      value: OverrideValue
    ) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { overrides: parsedOverrides } = parsedTable;
      const overrides = table.overrides;
      if (!overrides || !parsedOverrides) return;

      parsedOverrides.updateFieldValueByIndex(fieldName, overrideIndex, null);
      table.overrides = parsedOverrides.applyOverrides();

      let historyTitle = `Remove override ${value} from table "${tableName}"`;
      const overridesIsEmpty = !table.overrides || table.overrides.length === 0;
      if (overridesIsEmpty && parsedTable.isManual()) {
        sheet.removeTable(tableName);
        historyTitle = `Delete table "${tableName}"`;
      }

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const removeOverrideRow = useCallback(
    (tableName: string, overrideIndex: number) => {
      const context = findEditContext(tableName);

      if (!context) return;

      const { sheet, table } = context;
      table.overrides?.deleteItem(overrideIndex);

      const historyTitle = `Remove override row from "${tableName}"`;

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const removeTableOrOverrideRow = useCallback(
    (tableName: string, overrideIndex: number) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { parsedTable } = context;
      const { overrides } = parsedTable;

      if (!parsedTable.isManual() || !overrides || !overrides.overrideRows)
        return;

      if (overrides.overrideRows.length > 1) {
        removeOverrideRow(tableName, overrideIndex);

        return;
      } else {
        deleteTable(tableName);
      }
    },
    [deleteTable, findEditContext, removeOverrideRow]
  );

  const editOverride = useCallback(
    (
      tableName: string,
      fieldName: string,
      overrideIndex: number,
      value: string
    ) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const { overrides, fields } = parsedTable;

      if (!overrides) return;

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
        parsedTable.isManual() &&
        fields.length === 1 &&
        overrides?.overrideRows?.length === 1
      ) {
        const [row, col] = parsedTable.getPlacement();
        deleteTable(tableName);
        createDimTableFromFormula(col, row, `=${value}`);

        return;
      }

      overrides.updateFieldValueByIndex(fieldName, overrideIndex, value);
      table.overrides = overrides.applyOverrides();

      const historyTitle = `Edit override ${value} in table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [createDimTableFromFormula, deleteTable, findEditContext, updateDSL]
  );

  const addOverrides = useCallback(
    (
      selectedCol: number,
      selectedRow: number,
      tableName: string,
      cells: string[][],
      withShifting?: boolean
    ) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, parsedTable, table } = context;
      const updatedParsedOverrides = addOverridesToTable({
        parsedTable,
        cells,
        gridApi,
        selectedCol,
        selectedRow,
        withShifting,
      });

      if (!updatedParsedOverrides) return;

      table.overrides = updatedParsedOverrides.applyOverrides();

      const isSingleCellUpdated = cells.length === 1 && cells[0].length === 1;
      const historyTitle = isSingleCellUpdated
        ? `Add override "${cells[0][0]}" to table "${tableName}"`
        : `Add multiple overrides to table "${tableName}"`;

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, gridApi, updateDSL]
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
    addOverride: useSafeCallback(addOverride),
    addOverrides: useSafeCallback(addOverrides),
    editOverride: useSafeCallback(editOverride),
    removeOverride: useSafeCallback(removeOverride),
    removeOverrideRow: useSafeCallback(removeOverrideRow),
    removeTableOrOverrideRow: useSafeCallback(removeTableOrOverrideRow),
  };
}
