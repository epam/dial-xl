import { useCallback, useContext } from 'react';

import { escapeValue } from '@frontend/parser';

import { ViewportContext } from '../context';
import { findTableInSelection } from '../utils';
import { useCreateTableDsl, useOverridesEditDsl } from './EditDsl';
import { useGridApi } from './useGridApi';

export function usePasteCells() {
  const { viewGridData } = useContext(ViewportContext);
  const gridApi = useGridApi();
  const { createManualTable } = useCreateTableDsl();
  const { addOverrides } = useOverridesEditDsl();

  const pasteCells = useCallback(
    (cells: string[][]) => {
      if (!gridApi || cells.length === 0) return;

      const selection = gridApi.selection$.getValue();

      if (!selection) return;

      const { startCol, startRow } = selection;

      const tableStructure = viewGridData.getGridTableStructure();
      const tableMeta = findTableInSelection(tableStructure, selection);

      if (tableMeta) {
        const escapedCells = cells.map((row) =>
          row.map((cell) => escapeValue(cell))
        );

        addOverrides(startCol, startRow, tableMeta.tableName, escapedCells);

        return;
      }

      createManualTable(startCol, startRow, cells);
    },
    [gridApi, viewGridData, createManualTable, addOverrides]
  );

  return {
    pasteCells,
  };
}
