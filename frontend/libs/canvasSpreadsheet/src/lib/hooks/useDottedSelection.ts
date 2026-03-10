import { useCallback, useContext, useEffect } from 'react';

import { GridStateContext } from '../context';
import { Edges } from '../types';
import {
  getTableRowDottedSelection,
  isCellEditorOpen,
  showFieldDottedSelection,
} from '../utils';

export function useDottedSelection() {
  const { selectionEdges, getCell, showDottedSelection, hideDottedSelection } =
    useContext(GridStateContext);

  const updateDottedSelection = useCallback(
    (selection: Edges | null) => {
      if (isCellEditorOpen()) return;

      if (!selection) {
        hideDottedSelection();

        return;
      }

      const { startCol: col, startRow: row } = selection;

      const currentCell = getCell(col, row);

      if (currentCell?.table) {
        hideDottedSelection();

        return;
      }

      const leftTableCell = getCell(Math.max(1, col - 1), row);
      const topTableCell = getCell(col, Math.max(1, row - 1));
      const rightTableCell = getCell(col + 1, row);
      const bottomTableCell = getCell(col, row + 1);

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
          showDottedSelection,
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
          topTableCell.table,
        );
        showDottedSelection(dottedSelection);

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
          showDottedSelection,
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
          leftTableCell.table,
        );
        showDottedSelection(dottedSelection);

        return;
      }

      hideDottedSelection();
    },
    [getCell, hideDottedSelection, showDottedSelection],
  );

  useEffect(() => {
    updateDottedSelection(selectionEdges);
  }, [selectionEdges, updateDottedSelection]);
}
