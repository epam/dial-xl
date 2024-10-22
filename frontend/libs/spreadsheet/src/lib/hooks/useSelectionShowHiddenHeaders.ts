import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { GridCell, GridTable } from '@frontend/common';

import { Grid, GridSelection } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import { getTableRowDottedSelection } from '../utils/selection/dottedSelection';

export function useSelectionShowHiddenPlaceholders(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const placeholdersCells = useRef<(GridCell | { col: number; row: number })[]>(
    []
  );

  const hidePlaceholdersCells = useCallback(() => {
    placeholdersCells.current.forEach((cell) => {
      const fullCell = apiRef.current?.getCell(cell.col, cell.row);
      if (fullCell?.isPlaceholder) {
        apiRef.current?.setCell(cell.col, cell.row, {
          ...cell,
          startCol: (cell as GridCell).startCol ?? cell.col,
          endCol: (cell as GridCell).endCol ?? cell.col,
        });
      }
    });
  }, [apiRef, placeholdersCells]);

  // Return boolean which indicates if operation done or not
  const showPlaceholders = useCallback(
    (
      cellsInfo: {
        cellInfo: GridCell;
        currentCell: GridCell | undefined;
      }[],
      dottedSelection: GridSelection | undefined
    ): boolean => {
      const api = apiRef.current;
      if (!api || !cellsInfo.length) return false;

      cellsInfo.forEach(({ cellInfo, currentCell }) => {
        api.setCell(cellInfo.col, cellInfo.row, cellInfo);

        placeholdersCells.current.push(
          currentCell || { col: cellInfo.col, row: cellInfo.row }
        );
      });

      if (dottedSelection) {
        api.updateDottedSelectionAfterDataChanged(dottedSelection);
      }

      return true;
    },
    [apiRef]
  );

  // Return boolean which indicates if operation done or not
  const showPlaceholdersHeaderCells = useCallback(
    (
      col: number,
      row: number,
      table: GridTable,
      dottedSelection: GridSelection | undefined
    ): boolean => {
      const api = apiRef.current;

      if (!api) return false;

      const isTableNameHeaderHidden = table.isTableNameHeaderHidden;
      const isTableFieldsHeaderHidden = table.isTableFieldsHeaderHidden;
      const isTableHorizontal = table.isTableHorizontal;

      if (isTableFieldsHeaderHidden && isTableHorizontal) {
        const startRow =
          table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
        let cellsInfo: {
          cellInfo: GridCell;
          currentCell: GridCell | undefined;
        }[] = [];

        for (
          let currentRow = startRow;
          currentRow <= table.endRow;
          currentRow++
        ) {
          const cellField = api.getCell(col + 1, currentRow);
          const currentCell = api.getCell(col, currentRow);
          const fieldName = cellField?.field?.fieldName;

          if (currentCell?.table) {
            cellsInfo = [];

            break;
          }

          cellsInfo.push({
            cellInfo: {
              col: col,
              row: currentRow,
              startCol: col,
              endCol: col,
              isPlaceholder: true,
              value: fieldName || '',
            },
            currentCell,
          });
        }

        return showPlaceholders(cellsInfo, dottedSelection);
      }

      if (isTableFieldsHeaderHidden && !isTableHorizontal) {
        const tableCell = api.getCell(col, row + 1);
        let cellsInfo: {
          cellInfo: GridCell;
          currentCell: GridCell | undefined;
        }[] = [];

        for (
          let currentCol = table.startCol;
          currentCol <= table.endCol;
          currentCol++
        ) {
          const cellField = api.getCell(currentCol, row + 1);
          const currentCell = api.getCell(currentCol, row);
          const fieldName = cellField?.field?.fieldName;

          if (!cellField || currentCell?.table) {
            cellsInfo = [];

            break;
          }

          const { startCol, endCol } = cellField;

          const isSameTableCell =
            tableCell?.table?.tableName === cellField.table?.tableName;

          cellsInfo.push({
            cellInfo: {
              col: currentCol,
              row: row,
              startCol,
              endCol,
              isPlaceholder: true,
              value: isSameTableCell ? fieldName || '' : '',
            },
            currentCell,
          });
        }

        showPlaceholders(cellsInfo, dottedSelection);

        return showPlaceholders(cellsInfo, dottedSelection);
      }

      if (isTableNameHeaderHidden) {
        const tableName = table.tableName;
        let cellsInfo: {
          cellInfo: GridCell;
          currentCell: GridCell | undefined;
        }[] = [];

        for (
          let currentCol = table.startCol;
          currentCol <= table.endCol;
          currentCol++
        ) {
          const currentCell = api.getCell(currentCol, row);

          if (currentCell?.table) {
            cellsInfo = [];

            break;
          }

          cellsInfo.push({
            cellInfo: {
              col: currentCol,
              row: row,
              startCol: table.startCol,
              endCol: table.endCol,
              isPlaceholder: true,
              value: tableName || '',
            },
            currentCell,
          });
        }

        return showPlaceholders(cellsInfo, dottedSelection);
      }

      return false;
    },
    [apiRef, showPlaceholders]
  );

  const showHiddenHeadersPlaceholders = useCallback(
    (selection: GridSelection | null) => {
      const api = apiRef.current;

      if (!api) return;

      if (!selection) {
        api.hideDottedSelection();
        hidePlaceholdersCells();

        return;
      }

      const cell = api.getCell(selection.startCol, selection.startRow);

      if (!cell?.isPlaceholder) {
        api.hideDottedSelection();
        hidePlaceholdersCells();
      }

      const leftCell = api.getCell(selection.startCol - 1, selection.startRow);
      const topCell = api.getCell(selection.startCol, selection.startRow - 1);

      // We need to show table placeholders only if other add options not available
      if (leftCell?.table || topCell?.table) {
        api.hideDottedSelection();
        hidePlaceholdersCells();

        return;
      }

      const rightCell = api.getCell(selection.startCol + 1, selection.startRow);
      const bottomCell = api.getCell(
        selection.startCol,
        selection.startRow + 1
      );

      if (cell?.table) {
        return;
      }

      // When table fields header hidden
      if (
        bottomCell?.table?.isTableFieldsHeaderHidden &&
        !bottomCell?.table?.isTableHorizontal
      ) {
        const dottedSelection = getTableRowDottedSelection(
          { col: selection.startCol, row: selection.startRow },
          bottomCell.table
        );

        const result = showPlaceholdersHeaderCells(
          selection.startCol,
          selection.startRow,
          bottomCell.table,
          dottedSelection
        );

        if (
          result &&
          (selection.startCol !== bottomCell.startCol ||
            selection.endCol !== bottomCell.endCol) &&
          selection.startCol === selection.endCol
        ) {
          api.updateSelection({
            startCol: bottomCell.startCol,
            endCol: bottomCell.endCol,
            startRow: selection.startRow,
            endRow: selection.startRow,
          });

          return;
        }

        return;
      }

      if (
        rightCell?.table?.isTableFieldsHeaderHidden &&
        rightCell?.table?.isTableHorizontal
      ) {
        const dottedSelection = getTableRowDottedSelection(
          { col: selection.startCol, row: selection.startRow },
          rightCell.table!
        );

        showPlaceholdersHeaderCells(
          selection.startCol,
          selection.startRow,
          rightCell.table,
          dottedSelection
        );

        return;
      }

      // When table name header hidden
      if (
        bottomCell &&
        !bottomCell?.table?.isTableFieldsHeaderHidden &&
        bottomCell?.table?.isTableNameHeaderHidden
      ) {
        const dottedSelection = {
          startCol: bottomCell.table!.startCol,
          endCol: bottomCell.table!.endCol,
          startRow: selection.startRow,
          endRow: selection.startRow,
        };

        const result = showPlaceholdersHeaderCells(
          selection.startCol,
          selection.startRow,
          bottomCell.table,
          dottedSelection
        );

        if (
          result &&
          (selection.startCol !== bottomCell.table.startCol ||
            selection.endCol !== bottomCell.table.endCol) &&
          selection.startCol === selection.endCol
        ) {
          api.updateSelection({
            startCol: bottomCell.table.startCol,
            endCol: bottomCell.table.endCol,
            startRow: selection.startRow,
            endRow: selection.startRow,
          });

          return;
        }

        return;
      }

      api.hideDottedSelection();
      hidePlaceholdersCells();
    },
    [apiRef, hidePlaceholdersCells, showPlaceholdersHeaderCells]
  );

  useEffect(() => {
    const api = apiRef.current;
    const gridService = gridServiceRef.current;

    if (!api || !gridService) return;

    const selectionUpdateSubscription = api.selection$.subscribe(
      (selection) => {
        if (!gridServiceRef.current) return;

        showHiddenHeadersPlaceholders(selection);
      }
    );

    return () => {
      selectionUpdateSubscription.unsubscribe();
    };
  }, [gridServiceRef, apiRef, gridCallbacksRef, showHiddenHeadersPlaceholders]);
}
