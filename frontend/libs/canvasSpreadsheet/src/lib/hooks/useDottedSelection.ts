import { RefObject, useCallback, useContext, useEffect } from 'react';

import { GridStateContext } from '../context';
import { Edges, GridApi } from '../types';
import { getTableRowDottedSelection, showFieldDottedSelection } from '../utils';

export function useDottedSelection(gridApi: RefObject<GridApi>) {
  const { selectionEdges } = useContext(GridStateContext);

  const updateDottedSelection = useCallback(
    (selection: Edges | null) => {
      if (!gridApi.current) return;

      const api = gridApi.current;

      if (!selection) {
        api.hideDottedSelection();

        return;
      }

      const { startCol: col, startRow: row } = selection;

      const currentCell = api.getCell(col, row);

      if (currentCell?.table) {
        api.hideDottedSelection();

        return;
      }

      const leftTableCell = api.getCell(Math.max(1, col - 1), row);
      const topTableCell = api.getCell(col, Math.max(1, row - 1));
      const rightTableCell = api.getCell(col + 1, row);
      const bottomTableCell = api.getCell(col, row + 1);

      // Vertical table field creation highlighting
      if (
        leftTableCell &&
        leftTableCell.table &&
        !leftTableCell.table?.isTableHorizontal &&
        leftTableCell?.field &&
        !topTableCell?.table &&
        !bottomTableCell?.table
      ) {
        showFieldDottedSelection(
          { col, row },
          leftTableCell.table,
          leftTableCell.endCol,
          api
        );

        return;
      }

      // Vertical manual table row creation highlighting
      if (
        topTableCell &&
        topTableCell.table?.isManual &&
        !topTableCell.table?.isTableHorizontal &&
        topTableCell?.field &&
        !leftTableCell?.table &&
        !rightTableCell?.table
      ) {
        const dottedSelection = getTableRowDottedSelection(
          { col, row },
          topTableCell.table
        );
        api.showDottedSelection(dottedSelection);

        return;
      }

      // Horizontal table field creation highlighting
      if (
        topTableCell &&
        topTableCell.table &&
        topTableCell.table?.isTableHorizontal &&
        topTableCell?.field &&
        !leftTableCell?.table &&
        !rightTableCell?.table
      ) {
        showFieldDottedSelection(
          { col, row },
          topTableCell.table,
          topTableCell.endCol,
          api
        );

        return;
      }

      // Horizontal manual table row creation highlighting
      if (
        leftTableCell &&
        leftTableCell.table &&
        leftTableCell.table.isManual &&
        leftTableCell.table?.isTableHorizontal &&
        leftTableCell?.field &&
        !topTableCell?.table &&
        !bottomTableCell?.table
      ) {
        const dottedSelection = getTableRowDottedSelection(
          { col, row },
          leftTableCell.table
        );
        api.showDottedSelection(dottedSelection);

        return;
      }

      api.hideDottedSelection();
    },
    [gridApi]
  );

  useEffect(() => {
    updateDottedSelection(selectionEdges);
  }, [selectionEdges, updateDottedSelection]);
}
