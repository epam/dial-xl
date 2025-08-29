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

    type Key = string;
    const firstCol = new Map<string, number>();

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = gridApi.getCell(col, row);
        if (!cell?.table) continue;

        const { table, field, isTableHeader } = cell;
        const key: Key = isTableHeader
          ? `${table.tableName}`
          : `${table.tableName}[${field?.fieldName ?? ''}]`;

        if (!firstCol.has(key)) firstCol.set(key, col);
      }
    }

    for (let row = startRow; row <= endRow; row++) {
      const rowData: string[] = [];

      for (let col = startCol; col <= endCol; col++) {
        const cell = gridApi.getCell(col, row);

        if (!cell?.table) {
          rowData.push('');
          continue;
        }

        const { table, field, isTableHeader, value } = cell;
        const key: Key = isTableHeader
          ? `${table.tableName}`
          : `${table.tableName}[${field?.fieldName ?? ''}]`;

        if (
          firstCol.get(key) === col ||
          (!cell.isTableHeader && cell.table.isTableHorizontal)
        ) {
          rowData.push(isTableHeader ? table.tableName : String(value ?? ''));
        } else {
          rowData.push('');
        }
      }

      rows.push(rowData);
    }

    const rowsString = rows.map((r) => r.join('\t')).join('\r\n');
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
