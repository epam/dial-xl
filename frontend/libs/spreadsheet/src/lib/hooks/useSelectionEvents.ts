import { MutableRefObject, useCallback, useEffect, useState } from 'react';

import {
  filterByTypeAndCast,
  Grid,
  GridSelection,
  GridSelectionShortcutExtendRangeSelection,
  GridSelectionShortcutMoveSelectAll,
  GridSelectionShortcutRangeSelection,
  GridSelectionShortcutSelectAll,
  GridSelectionShortcutSelectColumn,
  GridSelectionShortcutSelectRow,
  GridSelectionShortcutToRowEdge,
  GridSelectionShortcutType,
} from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import {
  extendRangeSelection,
  findTableInSelection,
  getSelectedCell,
  navigateToSheetEdge,
  rangeSelection,
  selectTable,
  selectTableColumnOrSheetColumn,
  selectTableRowOrSheetRow,
} from '../utils';

export function useSelectionEvents(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const [selectedTableName, setSelectedTableName] = useState<string | null>(
    null
  );
  const updateSelection = useCallback(
    (selection: GridSelection | null, moveMode = false) => {
      const api = apiRef.current;

      if (!api) return;

      api.updateSelection(selection, moveMode);
    },
    [apiRef]
  );

  const updateAppSelection = useCallback(
    (selection: GridSelection | null) => {
      if (!selection) {
        gridCallbacksRef.current.onSelectionChange?.(null);

        return;
      }

      gridCallbacksRef.current.onSelectionChange?.(
        getSelectedCell(gridServiceRef, selection)
      );
    },
    [gridCallbacksRef, gridServiceRef]
  );

  useEffect(() => {
    const api = apiRef.current;
    const gridService = gridServiceRef.current;

    if (!api || !gridService) return;

    const selectionUpdateSubscription = api.selection$.subscribe(
      (selection) => {
        if (!gridServiceRef.current) return;

        updateAppSelection(selection);

        if (selection) {
          const { startRow, endCol, endRow, startCol } = selection;

          if (!(startRow === endRow && startCol === endCol)) return;

          const cell = gridServiceRef.current.getCellValue(startRow, startCol);

          if (!cell || !cell.table) return;

          const { table } = cell;

          if (table.startRow === startRow) {
            api.selectTableHeader(table.startCol, table.endCol);
          }
        }
      }
    );

    const selectionToRowEdgeSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutToRowEdge>(
          GridSelectionShortcutType.SelectionToRowEdge
        )
      )
      .subscribe(({ direction }) => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const maxRow = gridService.getMaxRow();
        const updatedSelection = navigateToSheetEdge(
          selection,
          maxRow,
          direction
        );

        if (!updatedSelection) return;

        updateSelection(updatedSelection);
      });

    const selectAllSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutSelectAll>(
          GridSelectionShortcutType.SelectAll
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const tableStructure = gridService.getTableStructure();
        const maxRow = gridService.getMaxRow();

        const table = findTableInSelection(tableStructure, selection);

        if (!table) return;

        setSelectedTableName(table.tableName);

        const updatedSelection = selectTable(tableStructure, selection, maxRow);

        if (!updatedSelection) return;

        updateSelection(updatedSelection, true);
      });

    const moveSelectAllSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutMoveSelectAll>(
          GridSelectionShortcutType.MoveSelectAll
        )
      )
      .subscribe(({ rowDelta, colDelta }) => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;
        const callbacks = gridCallbacksRef.current;

        if (!api || !gridService || !selectedTableName || !callbacks) return;

        callbacks.onMoveTable?.(selectedTableName, rowDelta, colDelta);
      });

    const selectRowSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutSelectRow>(
          GridSelectionShortcutType.SelectRow
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const tableStructure = gridService.getTableStructure();

        const updatedSelection = selectTableRowOrSheetRow(
          tableStructure,
          selection
        );

        if (!updatedSelection) return;

        updateSelection(updatedSelection);
      });

    const selectColumnSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutSelectColumn>(
          GridSelectionShortcutType.SelectColumn
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const tableStructure = gridService.getTableStructure();
        const maxRow = gridService.getMaxRow();

        const updatedSelection = selectTableColumnOrSheetColumn(
          tableStructure,
          selection,
          maxRow
        );

        if (!updatedSelection) return;

        updateSelection(updatedSelection);
      });

    const rangeSelectionSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutRangeSelection>(
          GridSelectionShortcutType.RangeSelection
        )
      )
      .subscribe(({ direction }) => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;
        const maxRow = gridService.getMaxRow();

        const updatedSelection = rangeSelection(selection, direction, maxRow);

        updateSelection(updatedSelection);
      });

    const extendRangeSelectionSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutExtendRangeSelection>(
          GridSelectionShortcutType.ExtendRangeSelection
        )
      )
      .subscribe(({ direction }) => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const tableStructure = gridService.getTableStructure();
        const maxRow = gridService.getMaxRow();

        const updatedSelection = extendRangeSelection(
          tableStructure,
          selection,
          direction,
          maxRow
        );

        if (!updatedSelection) return;

        updateSelection(updatedSelection);
      });

    return () => {
      [
        selectionUpdateSubscription,
        selectAllSubscription,
        selectRowSubscription,
        selectColumnSubscription,
        rangeSelectionSubscription,
        extendRangeSelectionSubscription,
        moveSelectAllSubscription,
        selectionToRowEdgeSubscription,
      ].forEach((subscription) => subscription.unsubscribe());
    };
  }, [
    updateAppSelection,
    gridServiceRef,
    updateSelection,
    apiRef,
    gridCallbacksRef,
    selectedTableName,
  ]);
}
