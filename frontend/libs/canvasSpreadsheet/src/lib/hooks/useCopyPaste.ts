import { useCallback, useContext } from 'react';

import {
  ClipboardType,
  makeCopy,
  rowsToHtml,
  stringToArray,
} from '@frontend/common';

import { GridStateContext } from '../context';
import { GridEventBus, isCellEditorOpen } from '../utils';

export function useCopyPaste() {
  const { getCell, selectionEdges } = useContext(GridStateContext);

  const normalizeExpandedColumns = useCallback(
    (
      rows: string[][],
      params: {
        startRow: number;
        endRow: number;
        startCol: number;
        endCol: number;
      },
    ): string[][] => {
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
          const cell = getCell(globalCol, globalRow);

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
    },
    [getCell],
  );

  const copy = useCallback(() => {
    if (isCellEditorOpen()) return;

    if (!selectionEdges) return;

    const rows: string[][] = [];
    const startRow = Math.min(selectionEdges.startRow, selectionEdges.endRow);
    const endRow = Math.max(selectionEdges.startRow, selectionEdges.endRow);
    const startCol = Math.min(selectionEdges.startCol, selectionEdges.endCol);
    const endCol = Math.max(selectionEdges.startCol, selectionEdges.endCol);

    const firstCol = new Map<string, number>();

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = getCell(col, row);
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
        const cell = getCell(col, row);

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

    const normalizedRows = normalizeExpandedColumns(rows, {
      startRow,
      endRow,
      startCol,
      endCol,
    });
    const rowsString = normalizedRows.map((r) => r.join('\t')).join('\r\n');
    makeCopy(rowsString, rowsToHtml(normalizedRows));
  }, [getCell, normalizeExpandedColumns, selectionEdges]);

  const paste = useCallback(
    (eventBus: GridEventBus, e: ClipboardEvent) => {
      if (isCellEditorOpen()) return;

      if (!selectionEdges) return;

      e.preventDefault();
      e.stopPropagation();

      const dt = e.clipboardData;
      if (!dt) return;

      const plain = dt.getData(ClipboardType.PLAIN);
      if (!plain) return;

      const cells = stringToArray(plain, '\t');

      eventBus.emit({
        type: 'clipboard/paste',
        payload: { cells },
      });
    },
    [selectionEdges],
  );

  return {
    copy,
    paste,
  };
}
