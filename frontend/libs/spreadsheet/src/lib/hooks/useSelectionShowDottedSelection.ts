import { MutableRefObject, useCallback, useEffect } from 'react';

import { Grid, GridSelection } from '../grid';
import {
  getTableRowDottedSelection,
  showFieldDottedSelection,
} from '../utils/selection/dottedSelection';

export function useSelectionShowDottedSelectionEvents(
  apiRef: MutableRefObject<Grid | null>
) {
  const updateDottedSelection = useCallback(
    (selection: GridSelection | null) => {
      const api = apiRef.current;
      if (!api || !selection) return;

      const { startCol: col, startRow: row } = selection;

      const currentCell = api.getCell(col, row);
      if (currentCell?.table) return;

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
        showFieldDottedSelection({ col, row }, leftTableCell.table, api);

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
        showFieldDottedSelection({ col, row }, topTableCell.table, api);

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
    [apiRef]
  );

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    const selectionUpdateSubscription = api.selection$.subscribe(
      (selection) => {
        updateDottedSelection(selection);
      }
    );

    return () => {
      [selectionUpdateSubscription].forEach((subscription) =>
        subscription.unsubscribe()
      );
    };
  }, [apiRef, updateDottedSelection]);
}
