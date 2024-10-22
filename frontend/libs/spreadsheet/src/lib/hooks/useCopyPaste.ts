import { MutableRefObject, useCallback } from 'react';

import {
  ClipboardType,
  makeCopy,
  readClipboard,
  rowsToHtml,
  stringToArray,
} from '@frontend/common';

import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';

export function useCopyPaste(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const copy = useCallback(() => {
    const api = apiRef.current;
    const gridService = gridServiceRef.current;

    if (!api || !gridService || api?.isCellEditorOpen()) return;

    const selection = api.selection$.getValue();

    if (!selection) return;

    const rows: string[][] = [];
    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startCol = Math.min(selection.startCol, selection.endCol);
    const endCol = Math.max(selection.startCol, selection.endCol);

    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      for (let col = startCol; col <= endCol; col++) {
        const cell = gridService.getCellValue(row, col);
        cell?.table && rowData.push(cell.value || '');
      }
      rows.push(rowData);
    }

    const rowsString = rows.map((row) => row.join('\t')).join('\r\n');

    makeCopy(rowsString, rowsToHtml(rows));
  }, [apiRef, gridServiceRef]);

  const paste = useCallback(async () => {
    const api = apiRef.current;
    const gridService = gridServiceRef.current;

    if (!api || !gridService || api?.isCellEditorOpen()) return;

    const selection = api.selection$.getValue();

    if (!selection) return;

    const clipboardData = await readClipboard();

    // TODO: add support for HTML clipboard data and parse data-object-data
    if (clipboardData[ClipboardType.PLAIN]) {
      const cells = stringToArray(clipboardData[ClipboardType.PLAIN], '\t');

      gridCallbacksRef.current.onPaste?.(cells);
    }
  }, [apiRef, gridCallbacksRef, gridServiceRef]);

  return {
    copy,
    paste,
  };
}
