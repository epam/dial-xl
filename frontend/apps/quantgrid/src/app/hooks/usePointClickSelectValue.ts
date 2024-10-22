import { useCallback, useContext } from 'react';

import { escapeTableName } from '@frontend/common';
import { GridSelection } from '@frontend/spreadsheet';

import { AppContext, ProjectContext } from '../context';
import { EventBusMessages } from '../services';
import { useDSLUtils } from './ManualEditDSL';
import useEventBus from './useEventBus';
import { useFindTableKeys } from './useFindTableKeys';
import { useGridApi } from './useGridApi';

type ExternalValueOptions = {
  tableName?: string;
  fieldName?: string;
};

export function usePointClickSelectValue() {
  const { isPointClickMode, pointClickModeSource, canvasSpreadsheetMode } =
    useContext(AppContext);
  const { selectedCell } = useContext(ProjectContext);
  const gridApi = useGridApi();

  const { findTableKeys } = useFindTableKeys();
  const { findTable } = useDSLUtils();
  const { publish } = useEventBus<EventBusMessages>();

  /**
   * Get selected cell context (table name and field name)
   * treat empty selected cell on the right of any table as table cell
   */
  const getSelectedCellContext = useCallback(():
    | { selectedTableName: string; selectedFieldName: string }
    | undefined => {
    if (!gridApi || !selectedCell) return;

    const { row: selectedRow, col: selectedCol } = selectedCell;

    let selectedTableName = '';
    let selectedFieldName = '';
    const cell = gridApi.getCell(selectedCol, selectedRow);

    if (cell?.table) {
      selectedTableName = cell?.table?.tableName || '';
      selectedFieldName = cell?.field?.fieldName || '';
    }

    if (selectedCol > 1) {
      const rightCell = gridApi.getCell(selectedCol - 1, selectedRow);

      if (rightCell?.table) {
        selectedTableName = rightCell?.table?.tableName || '';
      }
    }

    return { selectedTableName, selectedFieldName };
  }, [gridApi, selectedCell]);

  /**
   * Get value for point-click external source (e.g. after click on project tree table or field)
   * @param externalValue {ExternalValueOptions} - external value options
   * @returns {string | undefined} - value for point-click external source
   */
  const getPointClickExternalValue = useCallback(
    (externalValue: ExternalValueOptions): string | undefined => {
      if (!gridApi || !selectedCell) return;

      const { tableName, fieldName } = externalValue;
      const sanitizedTableName = escapeTableName(tableName || '');

      if (tableName && !fieldName) return sanitizedTableName;

      const selectedContext = getSelectedCellContext();

      if (!selectedContext) return;

      const { selectedTableName } = selectedContext;

      if (tableName && fieldName) {
        const isSameTable = tableName === selectedTableName;

        return isSameTable
          ? `[${fieldName}]`
          : `${sanitizedTableName}[${fieldName}]`;
      }

      return;
    },
    [getSelectedCellContext, gridApi, selectedCell]
  );

  /**
   * Get value for point-click single selection
   * @param selection {GridSelection} - selection object
   * @returns {string | undefined} - value for point-click single selection
   */
  const getSingleSelectionPointClickValue = useCallback(
    (
      pointClickSelection: GridSelection,
      isRangeSelection = false
    ): string | undefined => {
      if (!gridApi || !selectedCell) return;

      const selectedContext = getSelectedCellContext();

      if (!selectedContext) return;

      const { selectedTableName } = selectedContext;
      const { row: selectedRow } = selectedCell;
      const { startRow: targetStartRow, startCol: targetStartCol } =
        pointClickSelection;

      const currentTable = findTable(selectedTableName);
      const targetCell = gridApi.getCell(targetStartCol, targetStartRow);
      const targetTable = findTable(targetCell?.table?.tableName || '');

      if (!targetTable) {
        if (!canvasSpreadsheetMode) {
          gridApi.hideCellEditor();
        }

        return;
      }

      const targetTableName = targetTable.tableName;
      const targetFieldName = targetCell?.field?.fieldName || '';
      const isSameTable = targetTableName === selectedTableName;
      const isSameRow = selectedRow === targetStartRow;
      const isTableHeader = targetCell?.isTableHeader;
      const isTableField = targetCell?.isFieldHeader;
      const isTotal = !!targetCell?.totalIndex;
      const isTableCell = !isTableHeader && !isTableField;
      const sanitizedTargetTableName = escapeTableName(targetTableName);
      const tableHasKeys = currentTable?.hasKeys();

      let isFieldHeaderEditing = false;

      if (currentTable) {
        const currentCell = gridApi.getCell(selectedCell.col, selectedCell.row);
        isFieldHeaderEditing = !!currentCell?.isFieldHeader;
      }

      if (
        (selectedTableName && !targetFieldName) ||
        (!selectedTableName && isTableHeader)
      ) {
        return sanitizedTargetTableName;
      }

      if (isTotal) {
        return `TOTAL(${sanitizedTargetTableName}, ${targetCell.totalIndex})[${targetFieldName}]`;
      }

      if (
        isTableField ||
        isRangeSelection ||
        (isSameRow && isSameTable) ||
        (!selectedTableName && isTableField)
      ) {
        return isSameTable
          ? `[${targetFieldName}]`
          : `${sanitizedTargetTableName}[${targetFieldName}]`;
      }

      if (isTableCell && isSameTable) {
        if (isFieldHeaderEditing || tableHasKeys) {
          const findKeys = findTableKeys(targetTable, targetStartRow);

          return `${sanitizedTargetTableName}(${findKeys})[${targetFieldName}]`;
        }

        const rowDeltaSign = selectedRow < targetStartRow ? `+` : `-`;
        const rowDelta = Math.abs(selectedRow - targetStartRow);

        return `${sanitizedTargetTableName}(ROW() ${rowDeltaSign} ${rowDelta})[${targetFieldName}]`;
      }

      if (isTableCell && !isSameTable) {
        const findKeys = findTableKeys(targetTable, targetStartRow);

        return `${sanitizedTargetTableName}(${findKeys})[${targetFieldName}]`;
      }

      return;
    },
    [
      canvasSpreadsheetMode,
      findTable,
      findTableKeys,
      getSelectedCellContext,
      gridApi,
      selectedCell,
    ]
  );

  /**
   * Get value for point-click range selection
   * @param selection {GridSelection} - selection object
   * @returns {string | undefined} - value for point-click range selection
   */
  const getRangeSelectionPointClickValue = useCallback(
    (pointClickSelection: GridSelection): string | undefined => {
      if (!gridApi || !selectedCell) return;

      const { startRow, endRow, endCol, startCol } = pointClickSelection;

      let singleSelectedCell = null;
      const tablesInSelection = new Set<string>();
      const fieldsInSelection = new Set<string>();

      for (let i = startRow; i <= endRow; i++) {
        for (let j = startCol; j <= endCol; j++) {
          const cell = gridApi.getCell(j, i);

          if (!cell) continue;

          if (cell.table?.tableName) {
            tablesInSelection.add(cell.table.tableName);
          }

          if (cell.field?.fieldName) {
            fieldsInSelection.add(cell.field.fieldName);
          }

          if (!singleSelectedCell) {
            singleSelectedCell = cell;
          }
        }
      }

      if (tablesInSelection.size === 1 && fieldsInSelection.size < 2) {
        return getSingleSelectionPointClickValue(
          {
            startRow,
            endRow: startRow,
            startCol,
            endCol: startCol,
          },
          startRow !== endRow
        );
      }

      return;
    },
    [getSingleSelectionPointClickValue, gridApi, selectedCell]
  );

  /**
   * Get type of point-click selection (single or range) and get value
   * @param pointClickSelection {GridSelection} - point-click selection object
   * @returns {string | undefined} - value for point-click selection
   */
  const getPointClickValue = useCallback(
    (pointClickSelection: GridSelection | null): string | undefined => {
      if (!gridApi || !isPointClickMode || !selectedCell) return;

      if (!pointClickSelection) return;

      const { startRow, endRow, endCol, startCol } = pointClickSelection;
      const singlePointClickCellSelected =
        startRow === endRow && startCol === endCol;

      return singlePointClickCellSelected
        ? getSingleSelectionPointClickValue(pointClickSelection)
        : getRangeSelectionPointClickValue(pointClickSelection);
    },
    [
      getRangeSelectionPointClickValue,
      getSingleSelectionPointClickValue,
      gridApi,
      isPointClickMode,
      selectedCell,
    ]
  );

  /**
   * Handle event after select single cell, range of cells or project tree node
   * @param externalValue {string} - value from external source (e.g. after click on project tree table or field)
   * @param pointClickSelection {GridSelection} - point-click selection object
   */
  const handlePointClickSelectValue = useCallback(
    (
      externalValue?: ExternalValueOptions | null,
      pointClickSelection: GridSelection | null = null
    ) => {
      if (!gridApi || !isPointClickMode || !selectedCell) return;

      const value = externalValue
        ? getPointClickExternalValue(externalValue)
        : getPointClickValue(pointClickSelection);

      gridApi.setPointClickError(!value);

      if (pointClickModeSource === 'cell-editor') {
        gridApi.setPointClickValue(value || '');
      } else if (pointClickModeSource === 'formula-bar') {
        publish({
          topic: 'PointClickSetValue',
          payload: { value: value || '' },
        });
      }
    },
    [
      getPointClickExternalValue,
      getPointClickValue,
      gridApi,
      isPointClickMode,
      pointClickModeSource,
      publish,
      selectedCell,
    ]
  );

  return {
    handlePointClickSelectValue,
  };
}
