import { useCallback, useContext } from 'react';

import { PanelName } from '../common';
import {
  AppSpreadsheetInteractionContext,
  LayoutContext,
  ProjectContext,
  ViewportContext,
} from '../context';
import { useGridApi } from './useGridApi';

export function useOpenInDetailsPanel() {
  const { parsedSheets } = useContext(ProjectContext);
  const { openPanel } = useContext(LayoutContext);
  const { viewGridData } = useContext(ViewportContext);
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const gridApi = useGridApi();

  const openInDetailsPanel = useCallback(
    (tableName: string) => {
      const tableStructure = viewGridData.getGridTableStructure();

      const findStructure = tableStructure.find(
        (t) => t.tableName === tableName,
      );

      if (!findStructure) {
        for (const [sheetName, parsedSheet] of Object.entries(parsedSheets)) {
          const table = parsedSheet.tables.find(
            (t) => t.tableName === tableName,
          );

          if (table) {
            openPanel(PanelName.Details);
            openTable(sheetName, tableName);

            return;
          }
        }

        return;
      }

      const { startCol, endCol, startRow, endRow } = findStructure;
      gridApi?.updateSelection({
        startCol,
        endCol,
        startRow,
        endRow,
      });

      openPanel(PanelName.Details);
    },
    [gridApi, openPanel, openTable, parsedSheets, viewGridData],
  );

  return { openInDetailsPanel };
}
