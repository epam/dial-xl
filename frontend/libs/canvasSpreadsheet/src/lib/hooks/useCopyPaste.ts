import { useCallback } from 'react';

import {
  ClipboardType,
  makeCopy,
  readClipboard,
  rowsToHtml,
  stringToArray,
} from '@frontend/common';

import { GridApi, GridCallbacks } from '../types';

export function useCopyPaste() {
  const copy = useCallback((gridApi: GridApi) => {
    if (gridApi?.isCellEditorOpen()) return;

    const selection = gridApi.selection$.getValue();

    if (!selection) return;

    const rows: string[][] = [];
    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startCol = Math.min(selection.startCol, selection.endCol);
    const endCol = Math.max(selection.startCol, selection.endCol);

    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      for (let col = startCol; col <= endCol; col++) {
        const cell = gridApi.getCell(col, row);
        cell?.table && rowData.push(cell.value || '');
      }
      rows.push(rowData);
    }

    const rowsString = rows.map((row) => row.join('\t')).join('\r\n');

    makeCopy(rowsString, rowsToHtml(rows));
  }, []);

  const paste = useCallback(
    async (gridApi: GridApi, gridCallbacks: GridCallbacks) => {
      if (gridApi?.isCellEditorOpen()) return;

      const selection = gridApi.selection$.getValue();

      if (!selection) return;

      const clipboardData = await readClipboard();

      // TODO: add support for HTML clipboard data and parse data-object-data
      if (clipboardData[ClipboardType.PLAIN]) {
        const cells = stringToArray(clipboardData[ClipboardType.PLAIN], '\t');

        gridCallbacks.onPaste?.(cells);
      }
    },
    []
  );

  return {
    copy,
    paste,
  };
}
