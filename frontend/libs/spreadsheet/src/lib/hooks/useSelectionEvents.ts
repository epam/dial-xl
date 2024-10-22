import { MutableRefObject, useCallback, useEffect, useState } from 'react';

import { defaults } from '../defaults';
import {
  filterByTypeAndCast,
  Grid,
  GridSelection,
  GridSelectionEventPointClickSelectValue,
  GridSelectionEventType,
  GridSelectionShortcutArrowBottomAfterEditNavigation,
  GridSelectionShortcutArrowLeftAfterEditNavigation,
  GridSelectionShortcutArrowRightAfterEditNavigation,
  GridSelectionShortcutArrowTopAfterEditNavigation,
  GridSelectionShortcutEnterAfterEditNavigation,
  GridSelectionShortcutExtendRangeSelection,
  GridSelectionShortcutMoveSelectAll,
  GridSelectionShortcutSelectAll,
  GridSelectionShortcutSelectColumn,
  GridSelectionShortcutSelectRow,
  GridSelectionShortcutTabNavigation,
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
          api,
          tableStructure,
          selection,
          maxRow
        );

        if (!updatedSelection) return;

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
          api,
          tableStructure,
          selection,
          direction,
          maxRow
        );

        if (!updatedSelection) return;

        updateSelection(updatedSelection);
      });

    const enterNavigationSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutEnterAfterEditNavigation>(
          GridSelectionShortcutType.EnterAfterEditNavigation
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const row = Math.min(selection.endRow + 1, defaults.viewport.rows);
        const col = selection.startCol;
        const updatedSelection = {
          startRow: row,
          endRow: row,
          startCol: col,
          endCol: col,
        };

        updateSelection(updatedSelection);
      });

    const tabNavigationSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutTabNavigation>(
          GridSelectionShortcutType.TabNavigation
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const cell = gridService.getCellValue(
          selection.startRow,
          selection.startCol
        );

        if (!cell?.table?.tableName) {
          const col = Math.min(selection.endCol + 1, defaults.viewport.cols);
          const row = selection.startRow;
          const updatedSelection = {
            startRow: row,
            endRow: row,
            startCol: col,
            endCol: col,
          };

          updateSelection(updatedSelection);

          return;
        }

        const tableName = cell.table.tableName;
        const tables = gridService.getTableStructure();
        const table = tables.find((table) => table.tableName === tableName);

        if (!table) return;

        if (table.endCol === selection.endCol) {
          const row = Math.min(selection.startRow + 1, defaults.viewport.rows);

          const updatedSelection = {
            startRow: row,
            endRow: row,
            startCol: table.startCol,
            endCol: table.startCol,
          };
          updateSelection(updatedSelection);

          if (table.endRow === selection.startRow && cell.table?.isManual) {
            gridCallbacksRef.current.onAddTableRow?.(
              table.startCol,
              row,
              tableName,
              ''
            );
          }

          return;
        }

        const col = Math.min(selection.endCol + 1, defaults.viewport.cols);
        const row = selection.startRow;
        const updatedSelection = {
          startRow: row,
          endRow: row,
          startCol: col,
          endCol: col,
        };

        updateSelection(updatedSelection);
      });

    const rightArrowNavigationSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutArrowRightAfterEditNavigation>(
          GridSelectionShortcutType.ArrowRightAfterEditNavigation
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const col = Math.min(selection.endCol + 1, defaults.viewport.cols);
        const row = selection.startRow;
        const updatedSelection = {
          startRow: row,
          endRow: row,
          startCol: col,
          endCol: col,
        };

        updateSelection(updatedSelection);
      });

    const leftArrowNavigationSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutArrowLeftAfterEditNavigation>(
          GridSelectionShortcutType.ArrowLeftAfterEditNavigation
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const col = Math.max(selection.endCol - 1, 0);
        const row = selection.startRow;
        const updatedSelection = {
          startRow: row,
          endRow: row,
          startCol: col,
          endCol: col,
        };

        updateSelection(updatedSelection);
      });

    const topArrowNavigationSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutArrowTopAfterEditNavigation>(
          GridSelectionShortcutType.ArrowTopAfterEditNavigation
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const col = selection.startCol;
        const row = Math.max(selection.endRow - 1, 0);
        const updatedSelection = {
          startRow: row,
          endRow: row,
          startCol: col,
          endCol: col,
        };

        updateSelection(updatedSelection);
      });

    const bottomArrowNavigationSubscription = api.selectionShortcuts$
      .pipe(
        filterByTypeAndCast<GridSelectionShortcutArrowBottomAfterEditNavigation>(
          GridSelectionShortcutType.ArrowBottomAfterEditNavigation
        )
      )
      .subscribe(() => {
        const api = apiRef.current;
        const gridService = gridServiceRef.current;

        if (!api || !gridService) return;

        const selection = api.selection$.getValue();

        if (!selection) return;

        const col = selection.startCol;
        const row = Math.min(selection.endRow + 1, defaults.viewport.rows);
        const updatedSelection = {
          startRow: row,
          endRow: row,
          startCol: col,
          endCol: col,
        };

        updateSelection(updatedSelection);
      });
    const pointClickSelectValueSubscription = api.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventPointClickSelectValue>(
          GridSelectionEventType.PointClickSelectValue
        )
      )
      .subscribe(({ pointClickSelection }) => {
        gridCallbacksRef.current.onPointClickSelectValue?.(pointClickSelection);
      });

    return () => {
      [
        selectionUpdateSubscription,
        selectAllSubscription,
        selectRowSubscription,
        selectColumnSubscription,
        extendRangeSelectionSubscription,
        moveSelectAllSubscription,
        selectionToRowEdgeSubscription,
        enterNavigationSubscription,
        tabNavigationSubscription,
        rightArrowNavigationSubscription,
        leftArrowNavigationSubscription,
        topArrowNavigationSubscription,
        bottomArrowNavigationSubscription,
        pointClickSelectValueSubscription,
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const api = apiRef.current;

      if (!api) return;

      api.selectionOnKeyDown(event);
    },
    [apiRef]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
