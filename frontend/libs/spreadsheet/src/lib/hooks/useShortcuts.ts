import { MutableRefObject, useCallback, useEffect, useMemo } from 'react';

import {
  ClipboardType,
  makeCopy,
  readClipboard,
  rowsToHtml,
  Shortcut,
  shortcutApi,
  ShortcutHandlersMap,
  stringToArray,
} from '@frontend/common';

import { Grid, GridCell } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import { isSpreadsheetTarget, scrollPage, swapFields } from '../utils';

export function useShortcuts(
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

      if (cells.length === 0) return;
      for (let row = 0; row < cells.length; row++) {
        for (let col = 0; col < cells[row].length; col++) {
          const existingCell = gridService.getCellValue(
            selection.startRow + row,
            selection.startCol + col
          );

          if (!existingCell?.table) continue;

          const updateCell: GridCell = {
            ...existingCell,
            value: cells[row][col],
          };

          gridService.setCell(
            selection.startRow + row,
            selection.startCol + col,
            updateCell
          );
        }
      }
    }
  }, [apiRef, gridServiceRef]);

  const handleSwapFields = useCallback(
    (direction: 'left' | 'right') => {
      swapFields(apiRef.current, gridServiceRef, gridCallbacksRef, direction);
    },
    [apiRef, gridCallbacksRef, gridServiceRef]
  );

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.SwapFieldsRight]: () => handleSwapFields('right'),
      [Shortcut.SwapFieldsLeft]: () => handleSwapFields('left'),
      [Shortcut.Copy]: () => copy(),
      [Shortcut.Paste]: () => paste(),
      [Shortcut.PageUp]: () => scrollPage('up'),
      [Shortcut.PageDown]: () => scrollPage('down'),
    }),
    [copy, paste, handleSwapFields]
  );

  const handleEvent = useCallback(
    (event: KeyboardEvent) => {
      if (!isSpreadsheetTarget(event)) return;

      for (const shortcutKey in shortcutGlobalHandlersMap) {
        if (shortcutApi.is(shortcutKey as Shortcut, event)) {
          shortcutGlobalHandlersMap[shortcutKey as Shortcut]?.(event);
          break;
        }
      }
    },
    [shortcutGlobalHandlersMap]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEvent);

    return () => {
      document.removeEventListener('keydown', handleEvent);
    };
  }, [handleEvent]);
}
