import { useCallback } from 'react';

import {
  ClipboardType,
  makeCopy,
  readClipboard,
  rowsToHtml,
  stringToArray,
} from '@frontend/common';

import { GridApi } from '../types';
import { GridEventBus } from '../utils';

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

    const firstCol = new Map<string, number>();

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = gridApi.getCell(col, row);
        if (!cell?.table) continue;

        const { table, field, isTableHeader } = cell;
        const key: string = isTableHeader
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
        const key: string = isTableHeader
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

    const normalizedRows = normalizeExpandedColumns(rows, gridApi, {
      startRow,
      endRow,
      startCol,
      endCol,
    });
    const rowsString = normalizedRows.map((r) => r.join('\t')).join('\r\n');
    makeCopy(rowsString, rowsToHtml(normalizedRows));
  }, []);

  const paste = useCallback(
    async (gridApi: GridApi, eventBus: GridEventBus) => {
      if (gridApi?.isCellEditorOpen()) return;

      const selection = gridApi.selection$.getValue();

      if (!selection) return;

      const clipboardData = await readClipboard();

      // TODO: add support for HTML clipboard data and parse data-object-data
      if (clipboardData[ClipboardType.PLAIN]) {
        const cells = stringToArray(clipboardData[ClipboardType.PLAIN], '\t');

        eventBus.emit({
          type: 'clipboard/paste',
          payload: {
            cells,
          },
        });
      }
    },
    []
  );

  return {
    copy,
    paste,
  };
}

function normalizeExpandedColumns(
  rows: string[][],
  gridApi: GridApi,
  params: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }
): string[][] {
  const { startRow, startCol, endCol } = params;

  if (!rows.length) return rows;

  const width = endCol - startCol + 1;
  if (width <= 0) return rows;

  const normalized: string[][] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const globalRow = startRow + rowIndex;
    const srcRow = rows[rowIndex];
    const dstRow: string[] = [];

    for (let offset = 0; offset < width; offset++) {
      const globalCol = startCol + offset;
      const cell = gridApi.getCell(globalCol, globalRow);

      let isContinuation = false;

      if (cell?.table) {
        const cellStart = cell.startCol ?? globalCol;
        const cellEnd = cell.endCol ?? globalCol;

        if (cellStart < globalCol && globalCol <= cellEnd) {
          isContinuation = true;
        }
      }

      const value = srcRow[offset] ?? '';

      if (isContinuation && value === '') {
        continue;
      }

      dstRow.push(value);
    }

    normalized.push(dstRow);
  }

  return normalized;
}
