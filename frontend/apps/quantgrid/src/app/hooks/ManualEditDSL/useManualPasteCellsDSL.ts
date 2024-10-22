import { useCallback, useContext } from 'react';

import { escapeOverrideValue } from '@frontend/parser';
import { findTableInSelection } from '@frontend/spreadsheet';

import { ViewportContext } from '../../context';
import { useGridApi } from '../useGridApi';
import { useManualCreateEntityDSL } from './useManualCreateEntityDSL';
import { useOverridesManualEditDSL } from './useOverridesManualEditDSL';

export function useManualPasteCellsDSL() {
  const { viewGridData } = useContext(ViewportContext);
  const gridApi = useGridApi();
  const { createManualTable } = useManualCreateEntityDSL();
  const { addOverrides } = useOverridesManualEditDSL();

  const pasteCells = useCallback(
    (cells: string[][]) => {
      if (!gridApi || cells.length === 0) return;

      const selection = gridApi.getSelection();

      if (!selection) return;

      const { startCol, startRow } = selection;

      const tableStructure = viewGridData.getGridTableStructure();
      const tableMeta = findTableInSelection(tableStructure, selection);

      if (tableMeta) {
        const escapedCells = cells.map((row) =>
          row.map((cell) => escapeOverrideValue(cell))
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
