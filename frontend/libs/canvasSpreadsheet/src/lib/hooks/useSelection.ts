import { useCallback, useContext, useEffect, useState } from 'react';

import { GridEvent } from '../components';
import { GridStateContext } from '../context';
import { Edges } from '../types';

export function useSelection() {
  const {
    gridSizes,
    selection$,
    setSelectionEdges,
    getCell,
    tableStructure,
    selectedTable,
    eventBus,
    gridApi,
  } = useContext(GridStateContext);

  const [selectionEdges, setLocalSelectionEdges] = useState<Edges | null>(null);

  const stopMoveTable = useCallback(() => {
    if (!selectionEdges) return;

    const { startRow, startCol } = selectionEdges;
    setSelectionEdges({
      startRow,
      startCol,
      endRow: startRow,
      endCol: startCol,
    });

    gridApi.event.emit({
      type: GridEvent.stopMoveEntity,
    });
  }, [gridApi, selectionEdges, setSelectionEdges]);

  const completeMoveTable = useCallback(() => {
    if (!selectedTable || !selectionEdges) return;

    const findTable = tableStructure.find(
      (table) => table.tableName === selectedTable,
    );

    if (!findTable) return;

    const { startRow, startCol } = findTable;

    const colDelta = selectionEdges.startCol - startCol;
    const rowDelta = selectionEdges.startRow - startRow;

    eventBus.emit({
      type: 'tables/move',
      payload: {
        tableName: selectedTable,
        rowDelta,
        colDelta,
      },
    });

    setSelectionEdges(selectionEdges);

    gridApi.event.emit({
      type: GridEvent.stopMoveEntity,
    });
  }, [
    gridApi,
    eventBus,
    selectedTable,
    selectionEdges,
    setSelectionEdges,
    tableStructure,
  ]);

  const selectTableByName = useCallback(
    (tableName: string) => {
      const findTable = tableStructure.find(
        (table) => table.tableName === tableName,
      );

      if (!findTable) return;

      const { startRow, endRow, startCol, endCol } = findTable;

      setSelectionEdges(
        {
          startRow,
          endRow,
          startCol,
          endCol,
        },
        {
          selectedTable: tableName,
        },
      );

      gridApi.event.emit({
        type: GridEvent.startMoveEntity,
      });
    },
    [gridApi, setSelectionEdges, tableStructure],
  );

  const selectTable = useCallback(() => {
    if (!selectionEdges) return;

    const { startRow, startCol } = selectionEdges;

    const cell = getCell(startCol, startRow);

    if (!cell?.table) return;

    const { table } = cell;

    setSelectionEdges(
      {
        startRow: table.startRow,
        endRow: table.endRow,
        startCol: table.startCol,
        endCol: table.endCol,
      },
      {
        selectedTable: table.tableName,
      },
    );

    gridApi.event.emit({
      type: GridEvent.startMoveEntity,
    });
  }, [getCell, gridApi, selectionEdges, setSelectionEdges]);

  const selectRow = useCallback(() => {
    if (!selectionEdges) return;

    const { edges } = gridSizes;
    const { startRow, startCol, endCol, endRow } = selectionEdges;

    const cell = getCell(startCol, startRow);

    const isTableRowSelected =
      cell?.table &&
      startCol <= cell.table.startCol &&
      endCol >= cell.table.endCol;

    if (!cell?.table || isTableRowSelected) {
      setSelectionEdges({
        startRow: startRow,
        endRow: endRow,
        startCol: 1,
        endCol: edges.col,
      });

      return;
    }

    if (!cell?.table) return;

    setSelectionEdges({
      startRow,
      endRow,
      startCol: cell.table.startCol,
      endCol: cell.table.endCol,
    });
  }, [getCell, gridSizes, selectionEdges, setSelectionEdges]);

  const selectColumn = useCallback(() => {
    if (!selectionEdges) return;

    const { edges } = gridSizes;
    const { startRow, startCol, endCol, endRow } = selectionEdges;

    const cell = getCell(startCol, startRow);
    const rowOffset = cell?.table?.isTableFieldsHeaderHidden ? 0 : 1;
    const isTableColumnSelected =
      cell?.table &&
      startRow <= cell.table.startRow + rowOffset &&
      (endRow >= cell.table.endRow || endRow >= edges.row);

    if (!cell?.table || isTableColumnSelected) {
      setSelectionEdges({
        startRow: 1,
        endRow: edges.row,
        startCol,
        endCol,
      });

      return;
    }

    if (!cell?.table) return;

    setSelectionEdges({
      startRow: cell.table.startRow + rowOffset,
      endRow: Math.min(edges.row, cell.table.endRow),
      startCol,
      endCol,
    });
  }, [getCell, gridSizes, selectionEdges, setSelectionEdges]);

  useEffect(() => {
    const selectionSubscription = selection$.subscribe(
      (edges: Edges | null) => {
        setLocalSelectionEdges(edges);
      },
    );

    return () => {
      selectionSubscription.unsubscribe();
    };
  }, [selection$]);

  return {
    selectRow,
    selectColumn,
    selectTable,
    selectTableByName,
    stopMoveTable,
    completeMoveTable,
  };
}
